import {apiSlice} from "../../api/apiSlice.js"
import {createArtifactWebSocket} from "../../utils/ws.js"

const USE_MOCK = String(import.meta.env.VITE_MOCK_API ?? "").toLowerCase() === "true"
const MOCK_DB_KEY = "mf_mock_db_v3"

const updateMockTaskRecord = (taskId, patch) => {
    try {
        const raw = window.localStorage.getItem(MOCK_DB_KEY)
        if (!raw) {
            return
        }
        const db = JSON.parse(raw)
        const task = db?.tasks?.find((item) => item.taskId === taskId)
        if (!task) {
            return
        }
        Object.assign(task, patch)
        window.localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db))
    } catch {
        // игнор ошибок мока
    }
}

const updateMockMicrotaskRecord = (microtaskId, patch) => {
    try {
        const raw = window.localStorage.getItem(MOCK_DB_KEY)
        if (!raw) {
            return
        }
        const db = JSON.parse(raw)
        const microtask = db?.microtasks?.find((item) => item.microtaskId === microtaskId)

        if (!microtask) {
            return
        }
        Object.assign(microtask, patch)
        window.localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db))
    } catch {
        // игнор ошибок мока
    }
}

const nowIso = () => new Date().toISOString()

const createTaskProgressInitialState = (taskId, executionType = "stateless") => ({
    taskId,
    executionType,
    taskStatus: null,
    seq: 0,
    kind: null,
    summary: null,
    config: null,
    microtasksByIndex: {},
    agentStatesByIndex: {},
    connectionStatus: "idle",
    finishedAt: null,
    doneAt: null,
    wsError: null,
})

const getProgressEntitySpec = (payload) => {
    if (Array.isArray(payload?.agentStates)) {
        return {
            executionType: "swarm-sync",
            items: payload.agentStates,
            idKey: "agentId",
            mapKey: "agentStatesByIndex",
        }
    }
    return {
        executionType: "stateless",
        items: Array.isArray(payload?.microtasks) ? payload.microtasks : [],
        idKey: "microtaskId",
        mapKey: "microtasksByIndex",
    }
}

const applyTaskProgressMessage = (draft, payload) => {
    if (!payload || payload.taskId !== draft.taskId) {
        return
    }
    const nextSeq = Number(payload.seq ?? 0)
    if (Number.isFinite(nextSeq) && nextSeq > 0 && nextSeq <= Number(draft.seq ?? 0)) {
        return
    }
    const isPatch = payload.kind === "patch"
    const spec = getProgressEntitySpec(payload)
    if (!isPatch) {
        draft.microtasksByIndex = {}
        draft.agentStatesByIndex = {}
        draft.config = payload.config ?? draft.config ?? null
    }
    draft.executionType = spec.executionType
    draft.seq = Number.isFinite(nextSeq) ? nextSeq : draft.seq
    draft.kind = payload.kind ?? draft.kind
    draft.taskStatus = payload.taskStatus ?? draft.taskStatus
    draft.summary = payload.summary ?? draft.summary
    draft.finishedAt = payload.finishedAt ?? draft.finishedAt
    draft.doneAt = payload.doneAt ?? draft.doneAt

    spec.items.forEach((item) => {
        const displayIndex = Number(item?.displayIndex)
        if (!Number.isFinite(displayIndex)) {
            return
        }
        const prevItem = draft[spec.mapKey][displayIndex] ?? {}

        draft[spec.mapKey][displayIndex] = {
            ...prevItem,
            ...item,
            [spec.idKey]: item?.[spec.idKey] ?? prevItem?.[spec.idKey] ?? "",
            displayIndex,
            status: item?.status ?? prevItem.status ?? "QUEUED",
        }
    })
}

const createMockRuntimeState = ({taskId, executionType}) => {
    if (executionType === "swarm-sync") {
        const total = 96
        const iterations = 18

        return {
            taskId,
            seq: 0,
            kind: "snapshot",
            taskStatus: "RUNNING",
            summary: {
                total,
                queued: 21,
                running: 15,
                succeeded: 49,
                failed: 7,
                timedOut: 4,
                tasksPerSec: 0.07,
                currentIteration: iterations,
                currentPhase: "STEP",
            },
            config: {
                executionType: "swarm-sync",
                swarm: {
                    iterations,
                    agentCount: total,
                    topology: {
                        type: "ring",
                        numberOfNeighbors: 2,
                    },
                },
                scheduling: {
                    mode: "fixed",
                    batchSize: 12,
                    parallelism: 12,
                },
                worker: {
                    resources: {
                        cpu: "2",
                        memory: "1024Mi",
                    },
                },
            },
            agentStates: Array.from({length: total}, (_, index) => ({
                agentId: `${taskId}-agent-${index}`,
                displayIndex: index,
                status:
                    index < 49 ? "SUCCEEDED" :
                        index < 56 ? "FAILED" :
                            index < 60 ? "TIMED_OUT" :
                                index < 75 ? "RUNNING" :
                                    "QUEUED",
                currentIteration: iterations,
                currentPhase: "STEP",
            })),
        }
    }

    return {
        taskId,
        seq: 0,
        kind: "snapshot",
        taskStatus: "RUNNING",
        summary: {
            total: 40,
            queued: 25,
            running: 4,
            succeeded: 8,
            failed: 2,
            timedOut: 1,
            tasksPerSec: 0.08,
        },
        microtasks: Array.from({length: 40}, (_, index) => ({
            microtaskId: `${taskId}-microtask-${index}`,
            displayIndex: index,
            status:
                index < 8 ? "SUCCEEDED" :
                    index < 10 ? "FAILED" :
                        index === 10 ? "TIMED_OUT" :
                            index < 15 ? "RUNNING" :
                                "QUEUED",
        })),
    }
}

const createMockRuntimeMicrotask = ({taskId, microtaskId}) => ({
    taskId,
    microtaskId,
    displayIndex: Number(String(microtaskId).split("-").at(-1)) || 0,
    status: "SUCCEEDED",
    createdAt: nowIso(),
    startedAt: nowIso(),
    finishedAt: nowIso(),
    runDeadline: nowIso(),
    runTimeoutSeconds: 60,
    reason: "",
})

const createMockSwarmAgent = ({taskId, agentId}) => {
    const agentIndex = Number(String(agentId).split("-").at(-1)) || 0

    return {
        agentId,
        taskId,
        agentIndex,
        inputData: JSON.stringify({
            minX: -10.0,
            maxX: 10.0,
            minY: -10.0,
            maxY: 10.0,
            seed: agentIndex,
        }),
        stateData: JSON.stringify({
            phase: "FINISH",
            iteration: 18,
            localBest: 84.83,
            topology: "RING",
        }),
        statePhase: "FINISH",
        stateIteration: 18,
    }
}

export const tasksApiSlice = apiSlice.injectEndpoints({
    endpoints: (build) => ({
        getProjectTasks: build.query({
            query: ({projectId, page = 0, size = 20}) => ({
                url: `/artifact-service/api/projects/${projectId}/tasks`,
                params: {page, size},
            }),
            providesTags: (result, _err, arg) => [
                { type: "ProjectTasks", id: `LIST:${arg.projectId}` },
                ...((result?.records ?? []).map((task) => ({
                    type: "ProjectTask",
                    id: task.taskId,
                }))),
            ],
        }),

        getProjectTask: build.query({
            query: ({projectId, taskId}) => ({
                url: `/artifact-service/api/projects/${projectId}/tasks/${taskId}`,
            }),
            providesTags: (_result, _err, arg) => [
                { type: "ProjectTask", id: arg.taskId },
            ],
        }),

        createProjectTask: build.mutation({
            query: ({projectId, ...body}) => ({
                url: `/artifact-service/api/projects/${projectId}/tasks`, method: "POST", body}),
            invalidatesTags: (_result, _err, arg) => [
                { type: "ProjectTasks", id: `LIST:${arg.projectId}` },
            ],
        }),

        cancelProjectTask: build.mutation({
            query: ({projectId, taskId}) => ({
                url: `/artifact-service/api/projects/${projectId}/tasks/${taskId}`, method: "PATCH"}),
            invalidatesTags: (_result, _err, arg) => [
                { type: "ProjectTasks", id: `LIST:${arg.projectId}` },
                { type: "ProjectTask", id: arg.taskId },
            ],
        }),

        getProjectTaskOutputs: build.query({
            query: ({projectId, taskId}) => ({
                url: `/artifact-service/api/projects/${projectId}/tasks/${taskId}/outputs`,
            }),
        }),

        getTaskOutputContent: build.query({
            query: ({projectId, outputId}) => ({
                url: `/artifact-service/api/projects/${projectId}/outputs/${outputId}/content`,
                responseHandler: async (response) => response.blob(),
                cache: "no-cache",
            }),
        }),

        getTaskRuntimeState: build.query({
            async queryFn({projectId, taskId, executionType = "stateless"}, _api, _extraOptions, baseQuery) {
                if (USE_MOCK) {
                    return {data: createMockRuntimeState({taskId, executionType})}
                }
                const statsType = executionType === "swarm-sync" ? "swarm" : "stateless"
                return baseQuery({
                    url: `/artifact-service/api/projects/${projectId}/tasks/${taskId}/stats/${statsType}`,
                })
            },
        }),

        getTaskRuntimeMicrotask: build.query({
            async queryFn({projectId, taskId, microtaskId}, _api, _extraOptions, baseQuery) {
                if (USE_MOCK) {
                    return {data: createMockRuntimeMicrotask({taskId, microtaskId})}
                }
                return baseQuery({
                    url: `/artifact-service/api/projects/${projectId}/tasks/${taskId}/microtasks/stateless/${microtaskId}`,
                })
            },
        }),

        getSwarmAgent: build.query({
            async queryFn({projectId, taskId, agentId}, _api, _extraOptions, baseQuery) {
                if (USE_MOCK) {
                    return {data: createMockSwarmAgent({taskId, agentId})}
                }
                return baseQuery({
                    url: `/artifact-service/api/projects/${projectId}/tasks/${taskId}/agents/${agentId}`,
                })
            },
        }),

        getTaskProgressStream: build.query({
            queryFn: ({taskId, executionType = "stateless"}) => ({
                data: createTaskProgressInitialState(taskId, executionType),
            }),
            keepUnusedDataFor: 0,
            async onCacheEntryAdded(
                {taskId, executionType = "stateless"},
                {getState, updateCachedData, cacheDataLoaded, cacheEntryRemoved}
            ) {
                await cacheDataLoaded

                if (USE_MOCK) {
                    if (executionType === "swarm-sync") {
                        let isStopped = false
                        let seq = 1
                        let patchTimer = null

                        const total = 96
                        const iterations = 18

                        const config = {
                            executionType: "swarm-sync",
                            swarm: {
                                iterations,
                                agentCount: total,
                                topology: {
                                    type: "ring",
                                    numberOfNeighbors: 2,
                                },
                            },
                            scheduling: {
                                mode: "fixed",
                                batchSize: 12,
                                parallelism: 12,
                            },
                            worker: {
                                resources: {
                                    cpu: "2",
                                    memory: "1024Mi",
                                },
                            },
                        }

                        let state = Array.from({length: total}, (_, i) => ({
                            agentId: `${taskId}-agent-${i}`,
                            displayIndex: i,
                            status:
                                i < 49 ? "SUCCEEDED" :
                                    i < 56 ? "FAILED" :
                                        i < 60 ? "TIMED_OUT" :
                                            i < 75 ? "RUNNING" :
                                                "QUEUED",
                            currentIteration: iterations,
                            currentPhase: "STEP",
                        }))

                        const buildSummary = () => ({
                            total,
                            queued: state.filter((item) => item.status === "QUEUED").length,
                            running: state.filter((item) => item.status === "RUNNING" || item.status === "STARTING").length,
                            succeeded: state.filter((item) => item.status === "SUCCEEDED").length,
                            failed: state.filter((item) => item.status === "FAILED").length,
                            timedOut: state.filter((item) => item.status === "TIMED_OUT").length,
                            tasksPerSec: 0.07,
                            currentIteration: iterations,
                            currentPhase: "STEP",
                        })

                        const toIndexMap = () =>
                            Object.fromEntries(state.map((item) => [item.displayIndex, item]))

                        updateCachedData((draft) => {
                            draft.connectionStatus = "open"
                            draft.seq = seq
                            draft.kind = "snapshot"
                            draft.executionType = "swarm-sync"
                            draft.taskStatus = "RUNNING"
                            draft.summary = buildSummary()
                            draft.config = config
                            draft.agentStatesByIndex = toIndexMap()
                            draft.finishedAt = null
                            draft.doneAt = null
                            draft.wsError = null
                        })

                        patchTimer = window.setInterval(() => {
                            if (isStopped) {
                                return
                            }

                            seq += 1

                            const changed = state
                                .filter((item) => item.status === "RUNNING")
                                .slice(0, 2)
                                .map((item) => ({
                                    ...item,
                                    status: "SUCCEEDED",
                                    currentPhase: "FINISH",
                                }))

                            const changedIndexes = new Set(changed.map((item) => item.displayIndex))

                            state = state.map((item) => {
                                if (changedIndexes.has(item.displayIndex)) {
                                    return changed.find((changedItem) => changedItem.displayIndex === item.displayIndex) ?? item
                                }

                                if (item.status === "QUEUED" && Math.random() > 0.85) {
                                    return {
                                        ...item,
                                        status: "RUNNING",
                                        currentPhase: "STEP",
                                    }
                                }

                                return item
                            })

                            const summary = buildSummary()

                            updateCachedData((draft) => {
                                draft.connectionStatus = "open"
                                draft.seq = seq
                                draft.kind = "patch"
                                draft.executionType = "swarm-sync"
                                draft.taskStatus = "RUNNING"
                                draft.summary = summary
                                draft.wsError = null

                                state.forEach((item) => {
                                    draft.agentStatesByIndex[item.displayIndex] = item
                                })
                            })
                        }, 1200)

                        try {
                            await cacheEntryRemoved
                        } finally {
                            isStopped = true

                            if (patchTimer) {
                                window.clearInterval(patchTimer)
                            }
                        }

                        return
                    }

                    let isStopped = false
                    let seq = 1
                    let patchTimer = null
                    let finishTimer = null
                    let finishedAtValue = null
                    let doneAtValue = null

                    const total = 40

                    const config = {
                        executionType: "stateless",
                        scheduling: {
                            mode: "asp",
                            maxParallelism: 200,
                            minParallelism: 1,
                            parallelism: undefined,
                        },
                        worker: {
                            bound: "cpu",
                            concurrency: 2,
                            resources: {
                                cpu: "500m",
                                memory: "512Mi",
                            },
                        },
                        timeouts: {
                            microtaskSeconds: 60,
                            taskSeconds: 3600,
                        },
                        retry: {
                            maxAttempts: 3,
                            backoff: {
                                strategy: "exponential",
                                baseMs: 500,
                                maxMs: 10000,
                                jitter: true,
                            },
                        },
                    }

                    const failureIndexes = new Set([9, 18, 31])
                    const timeoutIndexes = new Set([25])

                    let state = Array.from({length: total}, (_, i) => ({
                        microtaskId: `${taskId}-microtask-${i}`,
                        displayIndex: i,
                        status: i === 0 ? "RUNNING" : "QUEUED",
                        started_at: i === 0 ? nowIso() : null,
                        finished_at: null,
                    }))

                    const buildSummary = () => {
                        const summary = {
                            total,
                            queued: 0,
                            running: 0,
                            succeeded: 0,
                            failed: 0,
                            timedOut: 0,
                            tasksPerSec: 0.08,
                        }

                        state.forEach((item) => {
                            switch (item.status) {
                                case "SUCCEEDED":
                                    summary.succeeded += 1
                                    break
                                case "FAILED":
                                    summary.failed += 1
                                    break
                                case "TIMED_OUT":
                                    summary.timedOut += 1
                                    break
                                case "RUNNING":
                                case "STARTING":
                                    summary.running += 1
                                    break
                                case "QUEUED":
                                default:
                                    summary.queued += 1
                                    break
                            }
                        })

                        return summary
                    }

                    const toIndexMap = () =>
                        Object.fromEntries(
                            state.map((item) => [
                                item.displayIndex,
                                {
                                    microtaskId: item.microtaskId,
                                    displayIndex: item.displayIndex,
                                    status: item.status,
                                },
                            ])
                        )

                    updateCachedData((draft) => {
                        draft.connectionStatus = "open"
                        draft.seq = seq
                        draft.kind = "snapshot"
                        draft.executionType = "stateless"
                        draft.taskStatus = "RUNNING"
                        draft.summary = buildSummary()
                        draft.config = config
                        draft.microtasksByIndex = toIndexMap()
                        draft.finishedAt = null
                        draft.doneAt = null
                        draft.wsError = null
                    })

                    patchTimer = window.setInterval(() => {
                        if (isStopped) {
                            return
                        }

                        const runningIndex = state.findIndex((item) => item.status === "RUNNING")
                        const nextQueuedIndex = state.findIndex((item) => item.status === "QUEUED")
                        const changed = []

                        if (runningIndex !== -1) {
                            const current = state[runningIndex]

                            let nextStatus = "SUCCEEDED"

                            if (failureIndexes.has(current.displayIndex)) {
                                nextStatus = "FAILED"
                            } else if (timeoutIndexes.has(current.displayIndex)) {
                                nextStatus = "TIMED_OUT"
                            }

                            const currentFinishedAtValue = nowIso()

                            state = state.map((item, index) =>
                                index === runningIndex
                                    ? {
                                        ...item,
                                        status: nextStatus,
                                        finished_at: currentFinishedAtValue,
                                    }
                                    : item
                            )

                            updateMockMicrotaskRecord(state[runningIndex].microtaskId, {
                                status: state[runningIndex].status,
                                started_at: state[runningIndex].started_at,
                                finished_at: state[runningIndex].finished_at,
                            })

                            changed.push({...state[runningIndex]})
                        }

                        if (nextQueuedIndex !== -1) {
                            const startedAtValue = nowIso()

                            state = state.map((item, index) =>
                                index === nextQueuedIndex
                                    ? {
                                        ...item,
                                        status: "RUNNING",
                                        started_at: item.started_at ?? startedAtValue,
                                    }
                                    : item
                            )

                            updateMockMicrotaskRecord(state[nextQueuedIndex].microtaskId, {
                                status: "RUNNING",
                                started_at: state[nextQueuedIndex].started_at,
                            })

                            changed.push({...state[nextQueuedIndex]})
                        }

                        const summary = buildSummary()
                        const doneCount = summary.succeeded + summary.failed + summary.timedOut
                        const nextTaskStatus = doneCount >= total ? "FINISHED" : "RUNNING"

                        if (nextTaskStatus === "FINISHED" && !finishedAtValue) {
                            finishedAtValue = nowIso()

                            updateMockTaskRecord(taskId, {
                                status: "FINISHED",
                                taskStatus: "FINISHED",
                                finishedAt: finishedAtValue,
                                doneAt: doneAtValue,
                            })
                        }

                        seq += 1

                        updateCachedData((draft) => {
                            draft.connectionStatus = "open"
                            draft.seq = seq
                            draft.kind = "patch"
                            draft.executionType = "stateless"
                            draft.taskStatus = nextTaskStatus
                            draft.summary = summary
                            draft.finishedAt = finishedAtValue ?? draft.finishedAt
                            draft.doneAt = doneAtValue ?? draft.doneAt
                            draft.wsError = null

                            changed.forEach((item) => {
                                draft.microtasksByIndex[item.displayIndex] = {
                                    microtaskId: item.microtaskId,
                                    displayIndex: item.displayIndex,
                                    status: item.status,
                                }
                            })
                        })

                        if (nextTaskStatus === "FINISHED") {
                            window.clearInterval(patchTimer)

                            finishTimer = window.setTimeout(() => {
                                if (isStopped) {
                                    return
                                }

                                doneAtValue = nowIso()

                                updateMockTaskRecord(taskId, {
                                    status: "DONE",
                                    taskStatus: "DONE",
                                    finishedAt: finishedAtValue,
                                    doneAt: doneAtValue,
                                })

                                seq += 1

                                updateCachedData((draft) => {
                                    draft.connectionStatus = "open"
                                    draft.seq = seq
                                    draft.kind = "patch"
                                    draft.executionType = "stateless"
                                    draft.taskStatus = "DONE"
                                    draft.finishedAt = finishedAtValue
                                    draft.doneAt = doneAtValue
                                    draft.wsError = null
                                    draft.summary = {
                                        ...buildSummary(),
                                        running: 0,
                                        queued: 0,
                                        tasksPerSec: 0,
                                    }
                                })
                            }, 600)
                        }
                    }, 500)

                    try {
                        await cacheEntryRemoved
                    } finally {
                        isStopped = true

                        if (patchTimer) {
                            window.clearInterval(patchTimer)
                        }

                        if (finishTimer) {
                            window.clearTimeout(finishTimer)
                        }
                    }

                    return
                }

                let socket = null
                let reconnectTimer = null
                let reconnectAttempt = 0
                let isStopped = false

                const channel = `tasks/${taskId}/state`

                const connect = () => {
                    if (isStopped || !taskId) {
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
                                    applyTaskProgressMessage(draft, message.payload)
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
                            console.error("[task progress ws] parse/apply error", error)

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
    useGetProjectTasksQuery,
    useLazyGetProjectTasksQuery,
    useGetProjectTaskQuery,
    useCreateProjectTaskMutation,
    useCancelProjectTaskMutation,
    useGetProjectTaskOutputsQuery,
    useLazyGetTaskOutputContentQuery,
    useGetTaskRuntimeStateQuery,
    useGetTaskRuntimeMicrotaskQuery,
    useGetSwarmAgentQuery,
    useGetTaskProgressStreamQuery,
} = tasksApiSlice