import {apiSlice} from "../../api/apiSlice.js"
import {createArtifactWebSocket} from "../../utils/ws.js"

const USE_MOCK = String(import.meta.env.VITE_MOCK_API ?? "").toLowerCase() === "true"

const createMicrotaskLogsInitialState = (microtaskId) => ({
    microtaskId,
    logsBySeq: {},
    seq: -1,
    connectionStatus: "idle",
    wsError: null,
})

const applyMicrotaskLogsMessage = (draft, payload) => {
    if (!payload || payload.microtaskId !== draft.microtaskId) {
        return
    }
    if (!Array.isArray(payload.logs)) {
        return
    }
    payload.logs.forEach((item) => {
        const seq = Number(item?.seq)
        if (!Number.isFinite(seq)) {
            return
        }
        if (!draft.logsBySeq[seq]) {
            draft.logsBySeq[seq] = {
                seq,
                loglevel: item?.loglevel ?? "INFO",
                timestamp: item?.timestamp ?? "",
                message: item?.message ?? "",
            }
        }
        if (seq > Number(draft.seq ?? -1)) {
            draft.seq = seq
        }
    })
}

const createMockLogsBacklog = ({microtaskId, afterSeq = -1, limit = 1000}) => {
    const startSeq = Number(afterSeq)
    const safeAfterSeq = Number.isFinite(startSeq) ? startSeq : -1
    const safeLimit = Math.max(1, Number(limit ?? 1000) || 1000)

    const allLogs = Array.from({length: 12}, (_, index) => ({
        loglevel: index >= 10 ? "WARN" : "INFO",
        seq: index,
        timestamp: new Date(Date.now() - (12 - index) * 1000).toISOString(),
        message:
            index === 0 ? `microtask=${microtaskId} state=RUNNING` :
                index === 1 ? "loading dataset row" :
                    index === 2 ? "initializing worker" :
                        index < 10 ? `processing chunk ${index - 2}` :
                            index === 10 ? "finalizing result" :
                                "completed successfully",
    }))
    return {
        microtaskId,
        logs: allLogs
            .filter((item) => safeAfterSeq === -1 || item.seq > safeAfterSeq)
            .slice(0, safeLimit),
    }
}

export const microtasksApiSlice = apiSlice.injectEndpoints({
    endpoints: (build) => ({
        getProjectMicrotask: build.query({
            query: ({projectId, taskId, microtaskId}) => ({
                url: `/artifact-service/api/projects/${projectId}/tasks/${taskId}/microtasks/stateless/${microtaskId}`,
            }),
        }),

        getMicrotaskLogsBacklog: build.query({
            async queryFn({projectId, microtaskId, afterSeq = -1, limit = 1000}, _api, _extraOptions, baseQuery) {
                if (USE_MOCK) {
                    return {
                        data: createMockLogsBacklog({
                            microtaskId,
                            afterSeq,
                            limit,
                        }),
                    }
                }
                return baseQuery({
                    url: `/artifact-service/api/projects/${projectId}/logs/${microtaskId}`,
                    params: {afterSeq, limit},
                })
            },
        }),

        getMicrotaskLogsStream: build.query({
            queryFn: ({microtaskId}) => ({
                data: createMicrotaskLogsInitialState(microtaskId),
            }),
            keepUnusedDataFor: 0,
            async onCacheEntryAdded(
                {microtaskId},
                {getState, updateCachedData, cacheDataLoaded, cacheEntryRemoved}
            ) {
                await cacheDataLoaded

                if (USE_MOCK) {
                    let seq = 12
                    let step = 0
                    let timer = null
                    let isStopped = false

                    const pushLogs = (messages) => {
                        updateCachedData((draft) => {
                            draft.connectionStatus = "open"
                            draft.wsError = null

                            messages.forEach((message) => {
                                seq += 1
                                draft.logsBySeq[seq] = {
                                    seq,
                                    loglevel: "INFO",
                                    timestamp: new Date().toISOString(),
                                    message,
                                }
                                draft.seq = seq
                            })
                        })
                    }
                    pushLogs([
                        "live stream connected",
                    ])
                    timer = window.setInterval(() => {
                        if (isStopped) {
                            return
                        }
                        step += 1
                        if (step < 4) {
                            pushLogs([
                                `live processing chunk ${step}`,
                                `intermediate metric=${Math.round(Math.random() * 1000)}`,
                            ])
                            return
                        }
                        pushLogs([
                            "live completed successfully",
                        ])
                        window.clearInterval(timer)
                    }, 600)
                    try {
                        await cacheEntryRemoved
                    } finally {
                        isStopped = true
                        if (timer) {
                            window.clearInterval(timer)
                        }
                    }
                    return
                }

                let socket = null
                let reconnectTimer = null
                let reconnectAttempt = 0
                let isStopped = false

                const channel = `microtasks/${microtaskId}/logs`

                const connect = () => {
                    if (isStopped || !microtaskId) {
                        return
                    }
                    const token = getState()?.auth?.accessToken

                    if (!token) {
                        updateCachedData((draft) => {
                            draft.connectionStatus = "error"
                            draft.wsError = "Нет access token для WebSocket"
                        })
                        return
                    }

                    updateCachedData((draft) => {
                        draft.connectionStatus = reconnectAttempt > 0 ? "reconnecting" : "connecting"
                        draft.wsError = null
                    })

                    socket = createArtifactWebSocket(token)

                    socket.addEventListener("open", () => {
                        reconnectAttempt = 0

                        socket.send(JSON.stringify({
                            op: "subscribe",
                            channel,
                        }))

                        updateCachedData((draft) => {
                            draft.connectionStatus = "open"
                            draft.wsError = null
                        })
                    })

                    socket.addEventListener("message", (event) => {
                        try {
                            const message = JSON.parse(event.data)

                            updateCachedData((draft) => {
                                if (message.channel && message.channel !== channel) {
                                    return
                                }

                                if (message.type === "event") {
                                    draft.connectionStatus = "open"
                                    draft.wsError = null
                                    applyMicrotaskLogsMessage(draft, message.payload)
                                    return
                                }

                                if (message.type === "subscribed") {
                                    draft.connectionStatus = "open"
                                    draft.wsError = null
                                    return
                                }

                                if (message.type === "unsubscribed") {
                                    draft.connectionStatus = "closed"
                                    return
                                }

                                if (message.type === "error") {
                                    draft.connectionStatus = "error"
                                    draft.wsError = message.message ?? message.code ?? "WebSocket error"
                                }
                            })
                        } catch (error) {
                            console.error("[microtask logs ws] parse/apply error", error)

                            updateCachedData((draft) => {
                                draft.connectionStatus = "error"
                                draft.wsError = "Не удалось разобрать WebSocket сообщение"
                            })
                        }
                    })

                    socket.addEventListener("error", () => {
                        updateCachedData((draft) => {
                            draft.connectionStatus = "error"
                            draft.wsError = "WebSocket connection error"
                        })
                    })

                    socket.addEventListener("close", () => {
                        if (isStopped) {
                            return
                        }

                        updateCachedData((draft) => {
                            draft.connectionStatus = "closed"
                        })

                        reconnectAttempt += 1

                        const delay = Math.min(
                            1000 * 2 ** Math.min(reconnectAttempt, 4),
                            10000
                        )

                        reconnectTimer = window.setTimeout(() => {
                            connect()
                        }, delay)
                    })
                }
                connect()
                try {
                    await cacheEntryRemoved
                } finally {
                    isStopped = true
                    if (reconnectTimer) {
                        window.clearTimeout(reconnectTimer)
                    }

                    if (socket?.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({
                            op: "unsubscribe",
                            channel,
                        }))
                    }
                    socket?.close()
                }
            },
        }),
    }),
})

export const {
    useGetProjectMicrotaskQuery,
    useGetMicrotaskLogsBacklogQuery,
    useGetMicrotaskLogsStreamQuery,
} = microtasksApiSlice