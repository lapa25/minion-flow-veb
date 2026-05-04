import {apiSlice} from "../../api/apiSlice.js"
import {buildTaskProgressWsUrl} from "../../utils/ws.js"

const USE_MOCK = String(import.meta.env.VITE_MOCK_API ?? "").toLowerCase() === "true"
const MOCK_DB_KEY = "mf_mock_db_v2"

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

const createTaskProgressInitialState = (taskId, type = "stateless") => ({
    taskId,
    type,
    status: null,
    lastSeq: 0,
    summary: null,
    config: null,
    microtasksByIndex: {},
    agentStatesByIndex: {},
    connectionStatus: "idle",
    finishedAt: null,
    doneAt: null
})

const getProgressEntitySpec = (payload) => {
    if (Array.isArray(payload?.agentStates)) {
        return {
            type: "swarm",
            items: payload.agentStates,
            idKey: "agentId",
            mapKey: "agentStatesByIndex",
        }
    }
    return {
        type: "stateless",
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
    if (Number.isFinite(nextSeq) && nextSeq > 0 && nextSeq <= Number(draft.lastSeq ?? 0)) {
        return
    }
    const isPatch = payload.kind === "patch"
    const spec = getProgressEntitySpec(payload)
    if (!isPatch) {
        draft.microtasksByIndex = {}
        draft.agentStatesByIndex = {}
        draft.config = payload.config ?? draft.config ?? null
    }
    draft.type = spec.type
    draft.lastSeq = Number.isFinite(nextSeq) ? nextSeq : draft.lastSeq
    draft.status = payload.status ?? draft.status
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
            status: item?.status ?? prevItem.status ?? "CREATED",
        }
    })
}

const createMockRuntimeState = ({taskId, type}) => {
    if (type === "swarm") {
        const total = 96
        const iterations = 18

        return {
            taskId,
            seq: 0,
            kind: "snapshot",
            status: "RUNNING",
            summary: {
                total,
                queued: 21,
                running: 15,
                succeeded: 49,
                failed: 7,
                timedOut: 4,
                tasksPerSec: 0.07,
                currentIteration: iterations,
                currentPhase: "COMPLETE",
            },
            config: {
                type: "swarm",
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
                            index < 60 ? "TIME_OUT" :
                                index < 75 ? "RUNNING" :
                                    "QUEUED",
                currentIteration: iterations,
                currentPhase: "COMPLETE",
            })),
        }
    }

    return {
        taskId,
        seq: 0,
        kind: "snapshot",
        status: "RUNNING",
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
                        index === 10 ? "TIME_OUT" :
                            index < 15 ? "RUNNING" :
                                "QUEUED",
        })),
    }
}

const createMockRuntimeMicrotask = ({taskId, microtaskId, type}) => {
    const isSwarm = type === "swarm"

    return {
        taskId,
        microtaskId,
        displayIndex: Number(String(microtaskId).split("-").at(-1)) || 0,
        status: "SUCCEEDED",
        createdAt: nowIso(),
        startedAt: nowIso(),
        finishedAt: nowIso(),
        runDeadline: nowIso(),
        runTimeoutSeconds: isSwarm ? 3600 : 60,
        reason: "",
        ...(isSwarm
            ? {
                agentId: `${taskId}-agent-0`,
                phase: "FINISH",
                iteration: 2,
            }
            : {}),
    }
}

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
            phase: "COMPLETE",
            iteration: 18,
            localBest: 84.83,
            topology: "RING",
        }),
        statePhase: "COMPLETE",
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
            async queryFn({projectId, taskId, type}, _api, _extraOptions, baseQuery) {
                if (USE_MOCK) {
                    return {data: createMockRuntimeState({taskId, type})}
                }
                return baseQuery({
                    url: `/artifact-service/api/projects/${projectId}/tasks/${type}/${taskId}/state`,
                })
            },
        }),

        getTaskRuntimeMicrotask: build.query({
            async queryFn({projectId, taskId, microtaskId, type}, _api, _extraOptions, baseQuery) {
                if (USE_MOCK) {
                    return {data: createMockRuntimeMicrotask({taskId, microtaskId, type})}
                }
                return baseQuery({
                    url: `/artifact-service/api/projects/${projectId}/tasks/${type}/${taskId}/microtasks/${microtaskId}`,
                })
            },
        }),

        getSwarmAgent: build.query({
            async queryFn({projectId, taskId, agentId}, _api, _extraOptions, baseQuery) {
                if (USE_MOCK) {
                    return {data: createMockSwarmAgent({taskId, agentId})}
                }
                return baseQuery({
                    url: `/artifact-service/api/projects/${projectId}/tasks/swarm/${taskId}/agents/${agentId}`,
                })
            },
        }),

        getTaskProgressStream: build.query({
            queryFn: ({taskId, type = "stateless"}) => ({
                data: createTaskProgressInitialState(taskId, type),
            }),
            keepUnusedDataFor: 0,
            async onCacheEntryAdded({taskId, type = "stateless"}, {updateCachedData, cacheDataLoaded, cacheEntryRemoved}) {
                await cacheDataLoaded

                if (USE_MOCK) {
                    if (type === "swarm") {
                        let isStopped = false
                        let seq = 1
                        let patchTimer = null

                        const total = 96
                        const iterations = 18

                        const config = {
                            type: "swarm",
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
                                        i < 60 ? "TIME_OUT" :
                                            i < 75 ? "RUNNING" :
                                                "QUEUED",
                            currentIteration: iterations,
                            currentPhase: "COMPLETE",
                        }))

                        const buildSummary = () => ({
                            total,
                            queued: state.filter((item) => item.status === "QUEUED" || item.status === "CREATED").length,
                            running: state.filter((item) => item.status === "RUNNING" || item.status === "STARTING").length,
                            succeeded: state.filter((item) => item.status === "SUCCEEDED").length,
                            failed: state.filter((item) => item.status === "FAILED").length,
                            timedOut: state.filter((item) => item.status === "TIME_OUT" || item.status === "TIMED_OUT").length,
                            tasksPerSec: 0.07,
                            currentIteration: iterations,
                            currentPhase: "COMPLETE",
                        })

                        const toIndexMap = () =>
                            Object.fromEntries(state.map((item) => [item.displayIndex, item]))

                        updateCachedData((draft) => {
                            draft.connectionStatus = "open"
                            draft.lastSeq = seq
                            draft.type = "swarm"
                            draft.status = "RUNNING"
                            draft.summary = buildSummary()
                            draft.config = config
                            draft.agentStatesByIndex = toIndexMap()
                            draft.finishedAt = null
                            draft.doneAt = null
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
                                    }
                                }

                                return item
                            })

                            const summary = buildSummary()

                            updateCachedData((draft) => {
                                draft.connectionStatus = "open"
                                draft.lastSeq = seq
                                draft.status = "RUNNING"
                                draft.summary = summary

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
                        type: "stateless",
                        scheduling: {
                            mode: "asp",
                            maxParallelism: 200,
                            minParallelism: 1,
                            parallelism: undefined
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
                        status: i === 0 ? "RUNNING" : "CREATED",
                        started_at: i === 0 ? new Date().toISOString() : null,
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
                                case "TIME_OUT":
                                case "TIMED_OUT":
                                    summary.timedOut += 1
                                    break
                                case "RUNNING":
                                    summary.running += 1
                                    break
                                case "CREATED":
                                case "QUEUED":
                                case "STARTING":
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
                        draft.lastSeq = seq
                        draft.type = "stateless"
                        draft.status = "RUNNING"
                        draft.summary = buildSummary()
                        draft.config = config
                        draft.microtasksByIndex = toIndexMap()
                        draft.finishedAt = null
                        draft.doneAt = null
                    })

                    patchTimer = window.setInterval(() => {
                        if (isStopped) {
                            return
                        }

                        const runningIndex = state.findIndex((item) => item.status === "RUNNING")
                        const nextCreatedIndex = state.findIndex((item) => item.status === "CREATED")
                        const changed = []

                        if (runningIndex !== -1) {
                            const current = state[runningIndex]

                            let nextStatus = "SUCCEEDED"
                            if (failureIndexes.has(current.displayIndex)) {
                                nextStatus = "FAILED"
                            } else if (timeoutIndexes.has(current.displayIndex)) {
                                nextStatus = "TIME_OUT"
                            }

                            const finishedAtValue = new Date().toISOString()

                            state = state.map((item, index) =>
                                index === runningIndex
                                    ? {
                                        ...item,
                                        status: nextStatus,
                                        finished_at: finishedAtValue,
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

                        if (nextCreatedIndex !== -1) {
                            const startedAtValue = new Date().toISOString()

                            state = state.map((item, index) =>
                                index === nextCreatedIndex
                                    ? {
                                        ...item,
                                        status: "RUNNING",
                                        started_at: item.started_at ?? startedAtValue,
                                    }
                                    : item
                            )

                            updateMockMicrotaskRecord(state[nextCreatedIndex].microtaskId, {
                                status: "RUNNING",
                                started_at: state[nextCreatedIndex].started_at,
                            })

                            changed.push({...state[nextCreatedIndex]})
                        }

                        const summary = buildSummary()
                        const doneCount = summary.succeeded + summary.failed + summary.timedOut
                        const nextTaskStatus = doneCount >= total ? "FINISHED" : "RUNNING"

                        if (nextTaskStatus === "FINISHED" && !finishedAtValue) {
                            finishedAtValue = new Date().toISOString()

                            updateMockTaskRecord(taskId, {
                                status: "FINISHED",
                                finishedAt: finishedAtValue,
                            })
                        }

                        seq += 1

                        updateCachedData((draft) => {
                            draft.connectionStatus = "open"
                            draft.lastSeq = seq
                            draft.status = nextTaskStatus
                            draft.summary = summary
                            draft.finishedAt = finishedAtValue ?? draft.finishedAt
                            draft.doneAt = doneAtValue ?? draft.doneAt

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

                                doneAtValue = new Date().toISOString()

                                updateMockTaskRecord(taskId, {
                                    status: "DONE",
                                    finishedAt: finishedAtValue,
                                    doneAt: doneAtValue,
                                })

                                seq += 1

                                updateCachedData((draft) => {
                                    draft.connectionStatus = "open"
                                    draft.lastSeq = seq
                                    draft.status = "DONE"
                                    draft.finishedAt = finishedAtValue
                                    draft.doneAt = doneAtValue
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

                const connect = () => {
                    if (isStopped || !taskId) {
                        return
                    }
                    updateCachedData((draft) => {
                        draft.connectionStatus = reconnectAttempt > 0 ? "reconnecting" : "connecting"
                    })
                    socket = new WebSocket(buildTaskProgressWsUrl(taskId))

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
                                applyTaskProgressMessage(draft, payload)
                            })
                        } catch (error) {
                            console.error("[task progress ws] parse/apply error", error)
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
                        ++reconnectAttempt;
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