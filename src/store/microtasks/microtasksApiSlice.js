import {apiSlice} from "../../api/apiSlice.js"
import {buildMicrotaskLogsWsUrl} from "../../utils/ws.js"

const USE_MOCK = String(import.meta.env.VITE_MOCK_API ?? "").toLowerCase() === "true"

const createMicrotaskLogsInitialState = (microtaskId) => ({
    microtaskId,
    status: null,
    logsBySeq: {},
    lastSeq: 0,
    connectionStatus: "idle"
})

const applyMicrotaskLogsMessage = (draft, payload) => {
    if (!payload || payload.microtaskId !== draft.microtaskId) {
        return
    }
    draft.status = payload.status ?? draft.status
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
        if (seq > Number(draft.lastSeq ?? 0)) {
            draft.lastSeq = seq
        }
    })
}

export const microtasksApiSlice = apiSlice.injectEndpoints({
    endpoints: (build) => ({
        getProjectMicrotask: build.query({
            query: ({projectId, taskId, microtaskId}) => ({
                url: `/artifact-service/api/projects/${projectId}/tasks/${taskId}/microtasks/${microtaskId}`
            }),
        }),

        getMicrotaskLogsStream: build.query({
            queryFn: ({microtaskId}) => ({
                data: createMicrotaskLogsInitialState(microtaskId),
            }),
            keepUnusedDataFor: 0,
            async onCacheEntryAdded({microtaskId}, {updateCachedData, cacheDataLoaded, cacheEntryRemoved}) {
                await cacheDataLoaded

                if (USE_MOCK) {
                    let seq = 0
                    let step = 0
                    let timer = null
                    let isStopped = false

                    const pushLogs = (status, messages) => {
                        updateCachedData((draft) => {
                            draft.connectionStatus = "open"
                            draft.status = status
                            messages.forEach((message) => {
                                seq += 1
                                draft.logsBySeq[seq] = {
                                    seq,
                                    loglevel: "INFO",
                                    timestamp: new Date().toISOString(),
                                    message,
                                }
                                draft.lastSeq = seq
                            })
                        })
                    }

                    const shouldFail = microtaskId.endsWith("-24") || microtaskId.endsWith("-25")
                        || microtaskId.endsWith("-26")
                    const shouldTimeout = microtaskId.endsWith("-27")

                    pushLogs("RUNNING", [
                        `microtask=${microtaskId} state=RUNNING`,
                        "loading dataset row",
                        "initializing worker",
                    ])

                    timer = window.setInterval(() => {
                        if (isStopped) {
                            return
                        }
                        step += 1
                        if (step < 4) {
                            pushLogs("RUNNING", [
                                `processing chunk ${step}`,
                                `intermediate metric=${Math.round(Math.random() * 1000)}`,
                            ])
                            return
                        }
                        if (shouldFail) {
                            pushLogs("FAILED", [
                                "worker reported execution error",
                                "microtask state=FAILED",
                            ])
                            window.clearInterval(timer)
                            return
                        }
                        if (shouldTimeout) {
                            pushLogs("TIME_OUT", [
                                "execution timed out",
                                "microtask state=TIME_OUT",
                            ])
                            window.clearInterval(timer)
                            return
                        }
                        pushLogs("SUCCEEDED", [
                            "completed successfully",
                            "microtask state=SUCCEEDED",
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

                const connect = () => {
                    if (isStopped || !microtaskId) {
                        return
                    }
                    updateCachedData((draft) => {
                        draft.connectionStatus = reconnectAttempt > 0 ? "reconnecting" : "connecting"
                    })
                    socket = new WebSocket(buildMicrotaskLogsWsUrl(microtaskId))

                    socket.addEventListener("open", () => {
                        reconnectAttempt = 0
                        updateCachedData((draft) => {
                            draft.connectionStatus = "open"
                        })
                    })

                    socket.addEventListener("message", (event) => {
                        try {
                            const payload = JSON.parse(event.data)
                            updateCachedData((draft) => {
                                draft.connectionStatus = "open"
                                applyMicrotaskLogsMessage(draft, payload)
                            })
                        } catch {
                            updateCachedData((draft) => {
                                draft.connectionStatus = "error"
                            })
                        }
                    })

                    socket.addEventListener("error", () => {
                        updateCachedData((draft) => {
                            draft.connectionStatus = "error"
                        })
                    })

                    socket.addEventListener("close", () => {
                        if (isStopped) {
                            return
                        }
                        updateCachedData((draft) => {
                            draft.connectionStatus = "closed"
                        })
                        ++reconnectAttempt
                        const delay = Math.min(1000 * 2 ** Math.min(reconnectAttempt, 4), 10000)
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
                    if (socket) {
                        socket.close()
                    }
                }
            },
        }),
    }),
})

export const {useGetProjectMicrotaskQuery, useGetMicrotaskLogsStreamQuery} = microtasksApiSlice