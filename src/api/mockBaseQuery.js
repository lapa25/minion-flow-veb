const MOCK_DB_KEY = "mf_mock_db_v3"
const MOCK_SESSION_KEY = "mf_mock_session_v1"

const MOCK_LATENCY_MS = 120

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))

const clone = (value) => JSON.parse(JSON.stringify(value))

const nowIso = () => new Date().toISOString()

const createId = (prefix = "id") => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID()
    }
    return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now()}`
}

const normalizeExecutionType = (value) => {
    const raw = String(value ?? "stateless").toLowerCase()

    if (raw === "swarm" || raw === "swarm-sync") {
        return "swarm-sync"
    }

    return "stateless"
}

const normalizeTaskStatus = (value) => {
    const status = String(value ?? "CREATED").toUpperCase()

    if (status === "TIMEOUT" || status === "TIMED_OUT") {
        return "TIME_OUT"
    }

    return status
}

const normalizeEntityStatus = (value) => {
    const status = String(value ?? "QUEUED").toUpperCase()

    if (status === "TIME_OUT" || status === "TIMEOUT") {
        return "TIMED_OUT"
    }

    if (status === "CREATED") {
        return "QUEUED"
    }

    return status
}

const parseQueryString = (url) => {
    const [path, queryString = ""] = String(url ?? "").split("?")
    const params = {}

    if (queryString) {
        const searchParams = new URLSearchParams(queryString)
        for (const [key, value] of searchParams.entries()) {
            params[key] = value
        }
    }

    return { path, params }
}

const normalizeArgs = (args) => {
    if (typeof args === "string") {
        const { path, params } = parseQueryString(args)
        return {
            url: path,
            method: "GET",
            params,
            body: undefined,
            headers: {},
        }
    }

    const { path, params: urlParams } = parseQueryString(args?.url ?? "")

    return {
        url: path,
        method: String(args?.method ?? "GET").toUpperCase(),
        params: {
            ...urlParams,
            ...(args?.params ?? {}),
        },
        body: args?.body,
        headers: args?.headers ?? {},
    }
}

const parseBody = (body) => {
    if (body instanceof FormData) {
        const result = {}

        for (const [key, value] of body.entries()) {
            result[key] = value
        }

        return result
    }

    if (typeof body === "string") {
        try {
            return JSON.parse(body)
        } catch {
            return body
        }
    }

    return body ?? {}
}

const readFileContent = async (file, fallback) => {
    if (file && typeof file.text === "function") {
        try {
            return await file.text()
        } catch {
            return fallback
        }
    }

    return fallback
}

const ok = (data) => ({ data })

const fail = (status, data) => ({
    error: {
        status,
        data,
    },
})

const failCode = (status, code, message) =>
    fail(status, {
        code,
        message,
    })

const paginate = (records, pageRaw, sizeRaw) => {
    const total = records.length
    const pageIndex = Math.max(0, Number(pageRaw ?? 0) || 0)
    const pageSize = Math.max(1, Number(sizeRaw ?? 20) || 20)
    const pageCount = Math.max(1, Math.ceil(total / pageSize))
    const start = pageIndex * pageSize
    const pagedRecords = records.slice(start, start + pageSize)

    return {
        total,
        pageCount,
        pageSize,
        pageIndex,
        records: pagedRecords,
    }
}

const getSession = () => {
    try {
        const raw = window.localStorage.getItem(MOCK_SESSION_KEY)
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

const setSession = (value) => {
    if (!value) {
        window.localStorage.removeItem(MOCK_SESSION_KEY)
        return
    }

    window.localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(value))
}

const createAccessJwt = (userId) => `mock-access-token-${userId}`

const makeArtifactMeta = ({
                              artifactId,
                              originalName,
                              size,
                              contentType,
                              createdAt,
                              ownerId,
                          }) => ({
    artifactId,
    size,
    originalName,
    contentType,
    createdAt,
    ownerId,
})

const makeDefaultConfig = () => ({
    executionType: "stateless",
    scheduling: {
        mode: "asp",
        minParallelism: 1,
        maxParallelism: 40,
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
})

const makeDefaultSwarmConfig = () => ({
    executionType: "swarm-sync",
    swarm: {
        iterations: 18,
        agentCount: 96,
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
        bound: "cpu",
        concurrency: 1,
        resources: {
            cpu: "2",
            memory: "1024Mi",
        },
    },
    timeouts: {
        microtaskSeconds: 3600,
        taskSeconds: 3600,
    },
    retry: {
        maxAttempts: 0,
        backoff: {
            strategy: "fixed",
            baseMs: 0,
            maxMs: 0,
            jitter: false,
        },
    },
})

const makeLogRecords = (microtaskId, status = "SUCCEEDED") => {
    const createdAt = nowIso()

    const base = [
        `microtask=${microtaskId} state=STARTING`,
        "loading dataset row",
        "initializing worker",
        "processing chunk 1",
        "processing chunk 2",
    ]

    const finishMessages =
        status === "FAILED"
            ? ["worker reported execution error", "microtask state=FAILED"]
            : status === "TIMED_OUT"
                ? ["execution timed out", "microtask state=TIMED_OUT"]
                : ["completed successfully", "microtask state=SUCCEEDED"]

    return [...base, ...finishMessages].map((message, index) => ({
        loglevel:
            status === "FAILED" && index >= base.length
                ? "ERROR"
                : status === "TIMED_OUT" && index >= base.length
                    ? "WARN"
                    : "INFO",
        seq: index,
        timestamp: createdAt,
        message,
    }))
}

const createInitialDb = () => {
    const ownerId = "11111111-1111-4111-8111-111111111111"
    const maintainerId = "22222222-2222-4222-8222-222222222222"
    const userId = "33333333-3333-4333-8333-333333333333"

    const projectId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    const configId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
    const swarmConfigId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1"

    const artifactId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
    const inputId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"

    const taskId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"
    const swarmTaskId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1"

    const outputId = "ffffffff-ffff-4fff-8fff-ffffffffffff"
    const swarmOutputId = "ffffffff-ffff-4fff-8fff-fffffffffff1"

    const startedAt = nowIso()
    const createdAt = startedAt

    const users = [
        {
            userId: ownerId,
            username: "owner",
            email: "owner@example.com",
            password: "Password1",
            status: "ACTIVE",
        },
        {
            userId: maintainerId,
            username: "maintainer",
            email: "maintainer@example.com",
            password: "Password1",
            status: "ACTIVE",
        },
        {
            userId,
            username: "user",
            email: "user@example.com",
            password: "Password1",
            status: "ACTIVE",
        },
    ]

    const projects = [
        {
            projectId,
            projectName: "Demo project",
            projectDescription: "Проект для mock-режима",
            createdAt,
            ownerId,
        },
    ]

    const memberships = [
        {
            projectId,
            userId: ownerId,
            username: "owner",
            memberRole: "OWNER",
            memberSince: createdAt,
        },
        {
            projectId,
            userId: maintainerId,
            username: "maintainer",
            memberRole: "MAINTAINER",
            memberSince: createdAt,
        },
        {
            projectId,
            userId,
            username: "user",
            memberRole: "USER",
            memberSince: createdAt,
        },
    ]

    const configValue = makeDefaultConfig()
    const swarmConfigValue = makeDefaultSwarmConfig()

    const configs = [
        {
            configId,
            alias: "default-config",
            projectId,
            ownerId,
            createdAt,
            config: configValue,
        },
        {
            configId: swarmConfigId,
            alias: "default-swarm-config",
            projectId,
            ownerId,
            createdAt,
            config: swarmConfigValue,
        },
    ]

    const artifactContent = "mock jar binary content"
    const inputContent = `{"id":1,"value":"hello"}\n{"id":2,"value":"world"}`
    const outputContent = `{"result":"ok","count":2}`
    const swarmOutputContent = `{"result":"swarm-ok","best":84.83}`

    const artifacts = [
        {
            projectId,
            alias: "demo-task-runner.jar",
            artifact: makeArtifactMeta({
                artifactId,
                originalName: "demo-task-runner.jar",
                size: artifactContent.length,
                contentType: "application/java-archive",
                createdAt,
                ownerId,
            }),
            content: artifactContent,
        },
    ]

    const inputs = [
        {
            projectId,
            alias: "demo-input",
            inputType: "JSONL",
            artifact: makeArtifactMeta({
                artifactId: inputId,
                originalName: "demo-input.jsonl",
                size: inputContent.length,
                contentType: "application/x-ndjson",
                createdAt,
                ownerId,
            }),
            content: inputContent,
        },
    ]

    const tasks = [
        {
            taskId,
            projectId,
            launchedByUser: ownerId,
            status: "RUNNING",
            taskStatus: "RUNNING",
            executionType: "stateless",
            jarId: artifactId,
            jarAlias: "demo-task-runner.jar",
            inputId,
            inputAlias: "demo-input",
            configId,
            configAlias: "default-config",
            createdAt,
            startedAt,
            finishedAt: null,
            doneAt: null,
            launchSnapshot: clone(configValue),
        },
        {
            taskId: swarmTaskId,
            projectId,
            launchedByUser: ownerId,
            status: "RUNNING",
            taskStatus: "RUNNING",
            executionType: "swarm-sync",
            jarId: artifactId,
            jarAlias: "demo-task-runner.jar",
            inputId,
            inputAlias: "demo-input",
            configId: swarmConfigId,
            configAlias: "default-swarm-config",
            createdAt,
            startedAt,
            finishedAt: null,
            doneAt: null,
            launchSnapshot: clone(swarmConfigValue),
        },
    ]

    const outputs = [
        {
            projectId,
            taskId,
            outputId,
            meta: {
                artifactId: outputId,
                size: outputContent.length,
                originalName: "result.json",
                contentType: "application/json",
                createdAt,
                ownerId,
            },
            content: outputContent,
        },
        {
            projectId,
            taskId: swarmTaskId,
            outputId: swarmOutputId,
            meta: {
                artifactId: swarmOutputId,
                size: swarmOutputContent.length,
                originalName: "swarm-result.json",
                contentType: "application/json",
                createdAt,
                ownerId,
            },
            content: swarmOutputContent,
        },
    ]

    const microtasks = Array.from({ length: 40 }, (_, i) => {
        const status =
            i < 8
                ? "SUCCEEDED"
                : i === 8
                    ? "FAILED"
                    : i === 9
                        ? "TIMED_OUT"
                        : i < 14
                            ? "RUNNING"
                            : "QUEUED"

        return {
            microtaskId: `${taskId}-microtask-${i}`,
            taskId,
            projectId,
            displayIndex: i,
            status,
            createdAt,
            startedAt: ["RUNNING", "SUCCEEDED", "FAILED", "TIMED_OUT"].includes(status)
                ? startedAt
                : null,
            finishedAt: ["SUCCEEDED", "FAILED", "TIMED_OUT"].includes(status)
                ? startedAt
                : null,
            runDeadline: nowIso(),
            runTimeoutSeconds: 60,
            reason:
                status === "FAILED"
                    ? "mock failure"
                    : status === "TIMED_OUT"
                        ? "mock timeout"
                        : "",
        }
    })

    const microtaskLogs = Object.fromEntries(
        microtasks.map((item) => [
            item.microtaskId,
            makeLogRecords(item.microtaskId, item.status),
        ])
    )

    return {
        users,
        projects,
        memberships,
        configs,
        artifacts,
        inputs,
        tasks,
        outputs,
        microtasks,
        microtaskLogs,
        passwordResetRequests: [],
    }
}

const normalizeDb = (db) => {
    const nextDb = {
        users: [],
        projects: [],
        memberships: [],
        configs: [],
        artifacts: [],
        inputs: [],
        tasks: [],
        outputs: [],
        microtasks: [],
        microtaskLogs: {},
        passwordResetRequests: [],
        ...(db ?? {}),
    }

    nextDb.tasks = (nextDb.tasks ?? []).map((task) => {
        const executionType = normalizeExecutionType(
            task.executionType ?? task.type ?? task.launchSnapshot?.type
        )

        const taskStatus = normalizeTaskStatus(task.taskStatus ?? task.status)

        return {
            ...task,
            executionType,
            taskStatus,
            status: task.status ?? taskStatus,
        }
    })

    nextDb.microtasks = (nextDb.microtasks ?? []).map((microtask) => ({
        ...microtask,
        status: normalizeEntityStatus(microtask.status),
        createdAt: microtask.createdAt ?? microtask.created_at ?? nowIso(),
        startedAt: microtask.startedAt ?? microtask.started_at ?? null,
        finishedAt: microtask.finishedAt ?? microtask.finished_at ?? null,
        runDeadline: microtask.runDeadline ?? nowIso(),
        runTimeoutSeconds: microtask.runTimeoutSeconds ?? 60,
        reason: microtask.reason ?? "",
    }))

    nextDb.microtaskLogs = nextDb.microtaskLogs ?? {}

    nextDb.microtasks.forEach((microtask) => {
        if (!nextDb.microtaskLogs[microtask.microtaskId]) {
            nextDb.microtaskLogs[microtask.microtaskId] = makeLogRecords(
                microtask.microtaskId,
                microtask.status
            )
        }
    })

    return nextDb
}

const readDb = () => {
    try {
        const raw = window.localStorage.getItem(MOCK_DB_KEY)

        if (raw) {
            return normalizeDb(JSON.parse(raw))
        }
    } catch {
        // ignore mock storage errors
    }

    const initialDb = createInitialDb()
    window.localStorage.setItem(MOCK_DB_KEY, JSON.stringify(initialDb))
    return initialDb
}

const writeDb = (db) => {
    window.localStorage.setItem(MOCK_DB_KEY, JSON.stringify(normalizeDb(db)))
}

const requireAuth = (db) => {
    const session = getSession()

    if (!session?.userId) {
        return null
    }

    return db.users.find((item) => item.userId === session.userId) ?? null
}

const findProject = (db, projectId) =>
    db.projects.find((item) => item.projectId === projectId) ?? null

const findConfig = (db, projectId, configId) =>
    db.configs.find(
        (item) => item.projectId === projectId && item.configId === configId
    ) ?? null

const findArtifact = (db, projectId, artifactId) =>
    db.artifacts.find(
        (item) =>
            item.projectId === projectId &&
            item.artifact?.artifactId === artifactId
    ) ?? null

const findInput = (db, projectId, artifactId) =>
    db.inputs.find(
        (item) =>
            item.projectId === projectId &&
            item.artifact?.artifactId === artifactId
    ) ?? null

const findTask = (db, projectId, taskId) =>
    db.tasks.find(
        (item) => item.projectId === projectId && item.taskId === taskId
    ) ?? null

const findMicrotask = (db, projectId, taskId, microtaskId) =>
    db.microtasks.find(
        (item) =>
            item.projectId === projectId &&
            item.taskId === taskId &&
            item.microtaskId === microtaskId
    ) ?? null

const getProjectMembership = (db, projectId, userId) =>
    db.memberships.find(
        (item) => item.projectId === projectId && item.userId === userId
    ) ?? null

const requireProjectAccess = (db, projectId) => {
    const currentUser = requireAuth(db)

    if (!currentUser) {
        return {
            error: failCode(401, "insufficientPermission", "Нужна авторизация"),
        }
    }

    const project = findProject(db, projectId)

    if (!project) {
        return {
            error: failCode(401, "projectNotFound", "Проект не найден"),
        }
    }

    const membership = getProjectMembership(db, projectId, currentUser.userId)

    if (!membership) {
        return {
            error: failCode(401, "insufficientPermission", "Недостаточно прав"),
        }
    }

    return {
        currentUser,
        project,
        membership,
    }
}

const isManagerRole = (memberRole) =>
    memberRole === "OWNER" || memberRole === "MAINTAINER"

const requireProjectManager = (db, projectId) => {
    const access = requireProjectAccess(db, projectId)

    if (access.error) {
        return access
    }

    if (!isManagerRole(access.membership?.memberRole)) {
        return {
            error: failCode(401, "insufficientPermission", "Недостаточно прав"),
        }
    }

    return access
}

const buildTaskSummaryRecord = (task) => ({
    taskId: task.taskId,
    projectId: task.projectId,
    launchedByUser: task.launchedByUser,
    status: task.status ?? task.taskStatus,
    taskStatus: task.taskStatus ?? task.status,
    executionType: normalizeExecutionType(task.executionType ?? task.type),
    jarId: task.jarId,
    jarAlias: task.jarAlias,
    inputId: task.inputId,
    inputAlias: task.inputAlias,
    configId: task.configId,
    configAlias: task.configAlias,
    createdAt: task.createdAt,
    startedAt: task.startedAt,
    finishedAt: task.finishedAt,
    doneAt: task.doneAt,
    launchSnapshot: clone(task.launchSnapshot ?? null),
})

const buildTaskStatsPayload = (db, task, executionType) => {
    const normalizedExecutionType = normalizeExecutionType(executionType)

    if (normalizedExecutionType === "swarm-sync") {
        const config = task.launchSnapshot ?? makeDefaultSwarmConfig()
        const total = Math.min(Number(config?.swarm?.agentCount ?? 96) || 96, 300)
        const iterations = Number(config?.swarm?.iterations ?? 18) || 18

        const agentStates = Array.from({ length: total }, (_, index) => {
            const status =
                index < Math.floor(total * 0.52)
                    ? "SUCCEEDED"
                    : index < Math.floor(total * 0.6)
                        ? "FAILED"
                        : index < Math.floor(total * 0.64)
                            ? "TIMED_OUT"
                            : index < Math.floor(total * 0.8)
                                ? "RUNNING"
                                : "QUEUED"

            return {
                agentId: `${task.taskId}-agent-${index}`,
                displayIndex: index,
                status,
                currentIteration: iterations,
                currentPhase: status === "FAILED" ? "FAILED" : "STEP",
            }
        })

        const summary = {
            total,
            queued: agentStates.filter((item) => item.status === "QUEUED").length,
            running: agentStates.filter((item) => item.status === "RUNNING").length,
            succeeded: agentStates.filter((item) => item.status === "SUCCEEDED").length,
            failed: agentStates.filter((item) => item.status === "FAILED").length,
            timedOut: agentStates.filter((item) => item.status === "TIMED_OUT").length,
            tasksPerSec: 0.07,
            currentIteration: iterations,
            currentPhase: "STEP",
        }

        return {
            taskId: task.taskId,
            seq: 0,
            kind: "snapshot",
            taskStatus: normalizeTaskStatus(task.taskStatus ?? task.status),
            summary,
            agentStates,
        }
    }

    const microtasks = db.microtasks
        .filter((item) => item.taskId === task.taskId)
        .map((item) => ({
            microtaskId: item.microtaskId,
            displayIndex: item.displayIndex,
            status: normalizeEntityStatus(item.status),
        }))

    const summary = {
        total: microtasks.length,
        queued: microtasks.filter((item) =>
            ["QUEUED", "STARTING"].includes(item.status)
        ).length,
        running: microtasks.filter((item) => item.status === "RUNNING").length,
        succeeded: microtasks.filter((item) => item.status === "SUCCEEDED").length,
        failed: microtasks.filter((item) => item.status === "FAILED").length,
        timedOut: microtasks.filter((item) => item.status === "TIMED_OUT").length,
        tasksPerSec: 0.08,
    }

    return {
        taskId: task.taskId,
        seq: 0,
        kind: "snapshot",
        taskStatus: normalizeTaskStatus(task.taskStatus ?? task.status),
        summary,
        microtasks,
    }
}

const buildLegacyTaskStatePayload = (db, task, executionType) => {
    const payload = buildTaskStatsPayload(db, task, executionType)

    return {
        ...payload,
        status: payload.taskStatus,
    }
}

const buildAgentPayload = (db, projectId, taskId, agentId) => {
    const task = findTask(db, projectId, taskId)

    if (!task) {
        return failCode(404, "agentNotFound", "Агент не найден")
    }

    if (normalizeExecutionType(task.executionType) !== "swarm-sync") {
        return failCode(404, "agentNotFound", "Агент не найден")
    }

    const agentIndex = Number(String(agentId).split("-").at(-1)) || 0
    const config = task.launchSnapshot ?? makeDefaultSwarmConfig()

    return ok({
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
            phase: "STEP",
            iteration: Number(config?.swarm?.iterations ?? 18),
            localBest: 84.83,
            topology: config?.swarm?.topology?.type ?? "ring",
        }),
        statePhase: "STEP",
        stateIteration: Number(config?.swarm?.iterations ?? 18),
    })
}

const makeBlob = (content, contentType = "application/octet-stream") =>
    new Blob([content ?? ""], {
        type: contentType,
    })

const handleIdentityService = async ({ db, method, url, body, params }) => {
    if (url === "/identity-service/api/accounts" && method === "POST") {
        const payload = parseBody(body)

        const existingUser = db.users.find(
            (item) =>
                item.email.toLowerCase() ===
                String(payload?.email ?? "").toLowerCase()
        )

        if (existingUser) {
            return fail(409, {
                message: "Пользователь с таким email уже существует",
            })
        }

        const newUser = {
            userId: createId("user"),
            username: String(payload?.username ?? "").trim(),
            email: String(payload?.email ?? "").trim(),
            password: String(payload?.password ?? ""),
            status: "ACTIVE",
        }

        db.users.push(newUser)
        writeDb(db)

        return ok({
            userId: newUser.userId,
            username: newUser.username,
            email: newUser.email,
            status: newUser.status,
        })
    }

    if (url === "/identity-service/api/sessions" && method === "POST") {
        const payload = parseBody(body)

        const user = db.users.find(
            (item) =>
                item.email.toLowerCase() ===
                String(payload?.email ?? "").toLowerCase()
        )

        if (!user || user.password !== payload?.password) {
            return fail(401, {
                message: "Неверный email или пароль",
            })
        }

        setSession({
            userId: user.userId,
        })

        return ok({
            accessJWT: createAccessJwt(user.userId),
        })
    }

    if (url === "/identity-service/api/sessions/refresh" && method === "POST") {
        const session = getSession()

        if (!session?.userId) {
            return fail(401, {
                message: "Сессия не найдена",
            })
        }

        return ok({
            accessJWT: createAccessJwt(session.userId),
        })
    }

    if (url === "/identity-service/api/sessions/me" && method === "DELETE") {
        setSession(null)
        return ok({
            message: "logged out",
        })
    }

    if (url === "/identity-service/api/accounts/me" && method === "GET") {
        const currentUser = requireAuth(db)

        if (!currentUser) {
            return fail(401, {
                message: "Нужна авторизация",
            })
        }

        return ok({
            userId: currentUser.userId,
            username: currentUser.username,
            email: currentUser.email,
            status: currentUser.status,
        })
    }

    if (url === "/identity-service/api/accounts/me" && method === "PATCH") {
        const currentUser = requireAuth(db)

        if (!currentUser) {
            return fail(401, {
                message: "Нужна авторизация",
            })
        }

        const payload = parseBody(body)
        const nextUsername = String(payload?.newUsername ?? "").trim()

        if (!nextUsername) {
            return fail(400, {
                message: "newUsername обязателен",
            })
        }

        currentUser.username = nextUsername

        db.memberships.forEach((item) => {
            if (item.userId === currentUser.userId) {
                item.username = nextUsername
            }
        })

        writeDb(db)

        return ok({
            userId: currentUser.userId,
            username: currentUser.username,
            email: currentUser.email,
            status: currentUser.status,
        })
    }

    if (url === "/identity-service/api/accounts/me/passwords" && method === "PATCH") {
        const currentUser = requireAuth(db)

        if (!currentUser) {
            return fail(401, {
                message: "Нужна авторизация",
            })
        }

        const payload = parseBody(body)

        if (currentUser.password !== payload?.oldPassword) {
            return fail(400, {
                message: "Текущий пароль неверный",
            })
        }

        currentUser.password = String(payload?.newPassword ?? "")
        writeDb(db)

        return ok({
            message: "password updated",
        })
    }

    if (url === "/identity-service/api/account-activations" && method === "POST") {
        return ok({
            message: "activated",
            accountId: params?.accountId ?? null,
        })
    }

    if (url === "/identity-service/api/password-resets" && method === "POST") {
        const payload = parseBody(body)

        db.passwordResetRequests.push({
            id: createId("reset"),
            email: String(payload?.email ?? "").trim(),
            createdAt: nowIso(),
        })

        writeDb(db)

        return ok({
            message: "reset requested",
        })
    }

    if (url === "/identity-service/api/password-resets" && method === "PUT") {
        return ok({
            message: "password reset finished",
        })
    }

    return null
}

const handleProjectService = async ({ db, method, url, body, params }) => {
    if (url === "/project-service/projects" && method === "GET") {
        const currentUser = requireAuth(db)

        if (!currentUser) {
            return fail(401, {
                message: "Нужна авторизация",
            })
        }

        const memberProjectIds = new Set(
            db.memberships
                .filter((item) => item.userId === currentUser.userId)
                .map((item) => item.projectId)
        )

        const records = db.projects
            .filter((item) => memberProjectIds.has(item.projectId))
            .map((item) => clone(item))

        return ok(paginate(records, params?.page, params?.size))
    }

    if (url === "/project-service/projects" && method === "POST") {
        const currentUser = requireAuth(db)

        if (!currentUser) {
            return fail(401, {
                message: "Нужна авторизация",
            })
        }

        const payload = parseBody(body)
        const projectId = createId("project")
        const createdAt = nowIso()

        const project = {
            projectId,
            projectName: String(payload?.name ?? "").trim(),
            projectDescription: String(payload?.description ?? "").trim(),
            createdAt,
            ownerId: currentUser.userId,
        }

        db.projects.push(project)
        db.memberships.push({
            projectId,
            userId: currentUser.userId,
            username: currentUser.username,
            memberRole: "OWNER",
            memberSince: createdAt,
        })

        writeDb(db)

        return ok(clone(project))
    }

    const projectMatch =
        url.match(/^\/project-service\/projects\/([^/]+)$/) ||
        url.match(/^\/projects\/([^/]+)$/)

    if (projectMatch) {
        const [, projectId] = projectMatch
        const access = requireProjectAccess(db, projectId)

        if (access.error) {
            return access.error
        }

        if (method === "GET") {
            return ok(clone(access.project))
        }

        if (method === "PATCH") {
            const managerAccess = requireProjectManager(db, projectId)

            if (managerAccess.error) {
                return managerAccess.error
            }

            const payload = parseBody(body)

            access.project.projectName = String(
                payload?.name ?? access.project.projectName
            ).trim()

            access.project.projectDescription = String(
                payload?.description ?? access.project.projectDescription ?? ""
            ).trim()

            writeDb(db)

            return ok(clone(access.project))
        }

        if (method === "DELETE") {
            const managerAccess = requireProjectManager(db, projectId)

            if (managerAccess.error) {
                return managerAccess.error
            }

            db.projects = db.projects.filter((item) => item.projectId !== projectId)
            db.memberships = db.memberships.filter((item) => item.projectId !== projectId)
            db.configs = db.configs.filter((item) => item.projectId !== projectId)
            db.artifacts = db.artifacts.filter((item) => item.projectId !== projectId)
            db.inputs = db.inputs.filter((item) => item.projectId !== projectId)
            db.tasks = db.tasks.filter((item) => item.projectId !== projectId)
            db.outputs = db.outputs.filter((item) => item.projectId !== projectId)
            db.microtasks = db.microtasks.filter((item) => item.projectId !== projectId)

            writeDb(db)

            return ok({
                message: "deleted",
            })
        }
    }

    const membersMatch = url.match(/^\/project-service\/projects\/([^/]+)\/members$/)

    if (membersMatch) {
        const [, projectId] = membersMatch
        const access = requireProjectAccess(db, projectId)

        if (access.error) {
            return access.error
        }

        if (method === "GET") {
            const records = db.memberships
                .filter((item) => item.projectId === projectId)
                .map((item) => clone(item))

            return ok(paginate(records, params?.page, params?.size))
        }

        if (method === "POST") {
            const managerAccess = requireProjectManager(db, projectId)

            if (managerAccess.error) {
                return managerAccess.error
            }

            const payload = parseBody(body)

            const invitedUser = db.users.find(
                (item) =>
                    item.username.toLowerCase() ===
                    String(payload?.username ?? "").toLowerCase()
            )

            if (!invitedUser) {
                return fail(404, {
                    message: "Пользователь не найден",
                })
            }

            const existingMembership = db.memberships.find(
                (item) =>
                    item.projectId === projectId &&
                    item.userId === invitedUser.userId
            )

            if (existingMembership) {
                return fail(409, {
                    message: "Пользователь уже в проекте",
                })
            }

            const membership = {
                projectId,
                userId: invitedUser.userId,
                username: invitedUser.username,
                memberRole: payload?.memberRole ?? "USER",
                memberSince: nowIso(),
            }

            db.memberships.push(membership)
            writeDb(db)

            return ok(clone(membership))
        }
    }

    const memberMatch = url.match(
        /^\/project-service\/projects\/([^/]+)\/members\/([^/]+)$/
    )

    if (memberMatch) {
        const [, projectId, userId] = memberMatch
        const managerAccess = requireProjectManager(db, projectId)

        if (managerAccess.error) {
            return managerAccess.error
        }

        const membership = db.memberships.find(
            (item) => item.projectId === projectId && item.userId === userId
        )

        if (!membership) {
            return fail(404, {
                message: "Участник не найден",
            })
        }

        if (method === "PATCH") {
            const payload = parseBody(body)

            if (membership.memberRole !== "OWNER") {
                membership.memberRole = payload?.memberRole ?? membership.memberRole
            }

            writeDb(db)

            return ok(clone(membership))
        }

        if (method === "DELETE") {
            if (membership.memberRole === "OWNER") {
                return fail(400, {
                    message: "Нельзя удалить владельца проекта",
                })
            }

            db.memberships = db.memberships.filter(
                (item) => !(item.projectId === projectId && item.userId === userId)
            )

            writeDb(db)

            return ok({
                message: "removed",
            })
        }
    }

    return null
}

const handleArtifactService = async ({ db, method, url, body, params }) => {
    const logsMatch = url.match(
        /^\/artifact-service\/api\/projects\/([^/]+)\/logs\/([^/]+)$/
    )

    if (logsMatch && method === "GET") {
        const [, projectId, microtaskId] = logsMatch
        const access = requireProjectAccess(db, projectId)

        if (access.error) {
            return access.error
        }

        const microtask = db.microtasks.find(
            (item) => item.projectId === projectId && item.microtaskId === microtaskId
        )

        if (!microtask) {
            return failCode(404, "microtaskNotFound", "Микротаска не найдена")
        }

        if (!db.microtaskLogs[microtaskId]) {
            db.microtaskLogs[microtaskId] = makeLogRecords(
                microtaskId,
                microtask.status
            )
            writeDb(db)
        }

        const afterSeq = Number(params?.afterSeq ?? -1)
        const limitRaw = params?.limit
        const limit = limitRaw === undefined || limitRaw === null
            ? Infinity
            : Math.max(0, Number(limitRaw) || 0)

        const logs = [...(db.microtaskLogs[microtaskId] ?? [])]
            .filter((item) => Number(item.seq) > afterSeq)
            .sort((a, b) => Number(a.seq) - Number(b.seq))
            .slice(0, limit)

        return ok({
            microtaskId,
            logs,
        })
    }

    const configsMatch = url.match(
        /^\/artifact-service\/api\/projects\/([^/]+)\/executionConfigs$/
    )

    if (configsMatch) {
        const [, projectId] = configsMatch
        const access = requireProjectAccess(db, projectId)

        if (access.error) {
            return access.error
        }

        if (method === "GET") {
            const records = db.configs
                .filter((item) => item.projectId === projectId)
                .map((item) => ({
                    configId: item.configId,
                    alias: item.alias,
                    ownerId: item.ownerId,
                    createdAt: item.createdAt,
                }))

            return ok(paginate(records, params?.page, params?.size))
        }

        if (method === "POST") {
            const managerAccess = requireProjectManager(db, projectId)

            if (managerAccess.error) {
                return managerAccess.error
            }

            const payload = parseBody(body)
            const normalizedConfig = payload?.config ?? makeDefaultConfig()

            const record = {
                configId: createId("config"),
                alias: String(payload?.alias ?? "").trim(),
                projectId,
                ownerId: access.currentUser.userId,
                createdAt: nowIso(),
                config: {
                    ...normalizedConfig,
                    type: normalizeExecutionType(normalizedConfig?.type),
                },
            }

            db.configs.push(record)
            writeDb(db)

            return ok(clone(record))
        }
    }

    const configMatch = url.match(
        /^\/artifact-service\/api\/projects\/([^/]+)\/executionConfigs\/([^/]+)$/
    )

    if (configMatch) {
        const [, projectId, configId] = configMatch
        const access = requireProjectAccess(db, projectId)

        if (access.error) {
            return access.error
        }

        const record = findConfig(db, projectId, configId)

        if (!record) {
            return fail(404, {
                message: "Конфигурация не найдена",
            })
        }

        if (method === "GET") {
            return ok(clone(record))
        }

        if (method === "PATCH") {
            const managerAccess = requireProjectManager(db, projectId)

            if (managerAccess.error) {
                return managerAccess.error
            }

            const payload = parseBody(body)
            const nextConfig = payload?.config ?? record.config

            record.alias = String(payload?.alias ?? record.alias).trim()
            record.config = {
                ...nextConfig,
                type: normalizeExecutionType(nextConfig?.type),
            }

            writeDb(db)

            return ok(clone(record))
        }

        if (method === "DELETE") {
            const managerAccess = requireProjectManager(db, projectId)

            if (managerAccess.error) {
                return managerAccess.error
            }

            db.configs = db.configs.filter((item) => item.configId !== configId)
            writeDb(db)

            return ok({
                message: "deleted",
            })
        }
    }

    const artifactsMatch = url.match(
        /^\/artifact-service\/api\/projects\/([^/]+)\/artifacts$/
    )

    if (artifactsMatch) {
        const [, projectId] = artifactsMatch
        const access = requireProjectAccess(db, projectId)

        if (access.error) {
            return access.error
        }

        if (method === "GET") {
            const records = db.artifacts
                .filter((item) => item.projectId === projectId)
                .map((item) =>
                    clone({
                        alias: item.alias,
                        artifact: item.artifact,
                    })
                )

            return ok(paginate(records, params?.page, params?.size))
        }

        if (method === "POST") {
            const managerAccess = requireProjectManager(db, projectId)

            if (managerAccess.error) {
                return managerAccess.error
            }

            const payload = parseBody(body)
            const file = payload?.file
            const alias = String(payload?.alias ?? file?.name ?? "").trim()
            const content = await readFileContent(
                file,
                `mock content for ${file?.name ?? "artifact.jar"}`
            )

            const artifactId = createId("artifact")

            const record = {
                projectId,
                alias,
                artifact: makeArtifactMeta({
                    artifactId,
                    originalName: file?.name ?? `${alias || artifactId}.jar`,
                    size: Number(file?.size ?? content.length),
                    contentType: file?.type || "application/java-archive",
                    createdAt: nowIso(),
                    ownerId: access.currentUser.userId,
                }),
                content,
            }

            db.artifacts.push(record)
            writeDb(db)

            return ok(clone(record))
        }
    }

    const artifactContentMatch = url.match(
        /^\/artifact-service\/api\/projects\/([^/]+)\/artifacts\/([^/]+)\/content$/
    )

    if (artifactContentMatch) {
        const [, projectId, artifactId] = artifactContentMatch
        const access = requireProjectAccess(db, projectId)

        if (access.error) {
            return access.error
        }

        const record = findArtifact(db, projectId, artifactId)

        if (!record) {
            return fail(404, {
                message: "Артефакт не найден",
            })
        }

        if (method === "GET") {
            return ok(makeBlob(record.content, record.artifact?.contentType))
        }

        if (method === "PUT") {
            const managerAccess = requireProjectManager(db, projectId)

            if (managerAccess.error) {
                return managerAccess.error
            }

            const payload = parseBody(body)
            const file = payload?.file
            const content = await readFileContent(
                file,
                `mock content for ${file?.name ?? record.artifact?.originalName ?? "artifact.jar"}`
            )

            record.content = content
            record.artifact = {
                ...record.artifact,
                originalName: file?.name ?? record.artifact?.originalName,
                size: Number(file?.size ?? content.length),
                contentType: file?.type || record.artifact?.contentType,
                createdAt: nowIso(),
            }

            writeDb(db)

            return ok(clone(record))
        }
    }

    const artifactMatch = url.match(
        /^\/artifact-service\/api\/projects\/([^/]+)\/artifacts\/([^/]+)$/
    )

    if (artifactMatch) {
        const [, projectId, artifactId] = artifactMatch
        const access = requireProjectAccess(db, projectId)

        if (access.error) {
            return access.error
        }

        const record = findArtifact(db, projectId, artifactId)

        if (!record) {
            return fail(404, {
                message: "Артефакт не найден",
            })
        }

        if (method === "GET") {
            return ok(
                clone({
                    alias: record.alias,
                    artifact: record.artifact,
                })
            )
        }

        if (method === "PATCH") {
            const managerAccess = requireProjectManager(db, projectId)

            if (managerAccess.error) {
                return managerAccess.error
            }

            const payload = parseBody(body)

            if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
                return fail(400, {
                    message: "Ожидался body вида { alias: string }",
                })
            }

            const nextAlias = String(payload?.alias ?? "").trim()

            if (!nextAlias) {
                return fail(400, {
                    message: "alias обязателен",
                })
            }

            record.alias = nextAlias
            writeDb(db)

            return ok(
                clone({
                    alias: record.alias,
                    artifact: record.artifact,
                })
            )
        }

        if (method === "DELETE") {
            const managerAccess = requireProjectManager(db, projectId)

            if (managerAccess.error) {
                return managerAccess.error
            }

            db.artifacts = db.artifacts.filter(
                (item) =>
                    !(
                        item.projectId === projectId &&
                        item.artifact?.artifactId === artifactId
                    )
            )

            writeDb(db)

            return ok({
                message: "deleted",
            })
        }
    }

    const inputsMatch = url.match(
        /^\/artifact-service\/api\/projects\/([^/]+)\/inputs$/
    )

    if (inputsMatch) {
        const [, projectId] = inputsMatch
        const access = requireProjectAccess(db, projectId)

        if (access.error) {
            return access.error
        }

        if (method === "GET") {
            const records = db.inputs
                .filter((item) => item.projectId === projectId)
                .map((item) =>
                    clone({
                        alias: item.alias,
                        inputType: item.inputType,
                        artifact: item.artifact,
                    })
                )

            return ok(paginate(records, params?.page, params?.size))
        }

        if (method === "POST") {
            const payload = parseBody(body)
            const file = payload?.file
            const alias = String(payload?.alias ?? file?.name ?? "").trim()
            const inputType = String(payload?.inputType ?? "JSONL").toUpperCase()
            const content = await readFileContent(
                file,
                `mock content for ${file?.name ?? "input.jsonl"}`
            )

            const artifactId = createId("input")

            const record = {
                projectId,
                alias,
                inputType,
                artifact: makeArtifactMeta({
                    artifactId,
                    originalName: file?.name ?? `${alias || artifactId}.jsonl`,
                    size: Number(file?.size ?? content.length),
                    contentType: file?.type || "application/x-ndjson",
                    createdAt: nowIso(),
                    ownerId: access.currentUser.userId,
                }),
                content,
            }

            db.inputs.push(record)
            writeDb(db)

            return ok(clone(record))
        }
    }

    const inputContentMatch = url.match(
        /^\/artifact-service\/api\/projects\/([^/]+)\/inputs\/([^/]+)\/content$/
    )

    if (inputContentMatch) {
        const [, projectId, artifactId] = inputContentMatch
        const access = requireProjectAccess(db, projectId)

        if (access.error) {
            return access.error
        }

        const record = findInput(db, projectId, artifactId)

        if (!record) {
            return fail(404, {
                message: "Input не найден",
            })
        }

        if (method === "GET") {
            return ok(makeBlob(record.content, record.artifact?.contentType))
        }

        if (method === "PUT") {
            const payload = parseBody(body)
            const file = payload?.file
            const content = await readFileContent(
                file,
                `mock content for ${file?.name ?? record.artifact?.originalName ?? "input.jsonl"}`
            )

            record.content = content
            record.artifact = {
                ...record.artifact,
                originalName: file?.name ?? record.artifact?.originalName,
                size: Number(file?.size ?? content.length),
                contentType: file?.type || record.artifact?.contentType,
                createdAt: nowIso(),
            }

            writeDb(db)

            return ok(clone(record))
        }
    }

    const inputMatch = url.match(
        /^\/artifact-service\/api\/projects\/([^/]+)\/inputs\/([^/]+)$/
    )

    if (inputMatch) {
        const [, projectId, artifactId] = inputMatch
        const access = requireProjectAccess(db, projectId)

        if (access.error) {
            return access.error
        }

        const record = findInput(db, projectId, artifactId)

        if (!record) {
            return fail(404, {
                message: "Input не найден",
            })
        }

        if (method === "GET") {
            return ok(
                clone({
                    alias: record.alias,
                    inputType: record.inputType,
                    artifact: record.artifact,
                })
            )
        }

        if (method === "PATCH") {
            const payload = parseBody(body)

            record.alias = String(payload?.alias ?? record.alias).trim()
            record.inputType = String(payload?.inputType ?? record.inputType).toUpperCase()

            writeDb(db)

            return ok(
                clone({
                    alias: record.alias,
                    inputType: record.inputType,
                    artifact: record.artifact,
                })
            )
        }

        if (method === "DELETE") {
            db.inputs = db.inputs.filter(
                (item) =>
                    !(
                        item.projectId === projectId &&
                        item.artifact?.artifactId === artifactId
                    )
            )

            writeDb(db)

            return ok({
                message: "deleted",
            })
        }
    }

    const tasksMatch = url.match(
        /^\/artifact-service\/api\/projects\/([^/]+)\/tasks$/
    )

    if (tasksMatch) {
        const [, projectId] = tasksMatch
        const access = requireProjectAccess(db, projectId)

        if (access.error) {
            return access.error
        }

        if (method === "GET") {
            const records = db.tasks
                .filter((item) => item.projectId === projectId)
                .map(buildTaskSummaryRecord)

            return ok(paginate(records, params?.page, params?.size))
        }

        if (method === "POST") {
            const payload = parseBody(body)

            const config = findConfig(db, projectId, payload?.configId)
            const artifact = findArtifact(db, projectId, payload?.jarId)
            const input = findInput(db, projectId, payload?.inputId)

            if (!config) {
                return fail(404, {
                    message: "Конфигурация не найдена",
                })
            }

            if (!artifact) {
                return fail(404, {
                    message: "JAR артефакт не найден",
                })
            }

            if (!input) {
                return fail(404, {
                    message: "Input не найден",
                })
            }

            const executionType = normalizeExecutionType(
                payload?.executionType ?? payload?.type ?? config?.config?.type
            )

            const taskId = createId("task")
            const createdAt = nowIso()

            const task = {
                taskId,
                projectId,
                launchedByUser: access.currentUser.userId,
                status: "CREATED",
                taskStatus: "CREATED",
                executionType,
                jarId: artifact.artifact.artifactId,
                jarAlias: artifact.alias,
                inputId: input.artifact.artifactId,
                inputAlias: input.alias,
                configId: config.configId,
                configAlias: config.alias,
                createdAt,
                startedAt: null,
                finishedAt: null,
                doneAt: null,
                launchSnapshot: clone(config.config),
            }

            db.tasks.push(task)

            if (executionType === "stateless") {
                const total = 40

                const newMicrotasks = Array.from({ length: total }, (_, index) => {
                    const microtaskId = `${taskId}-microtask-${index}`

                    return {
                        microtaskId,
                        taskId,
                        projectId,
                        displayIndex: index,
                        status: index === 0 ? "RUNNING" : "QUEUED",
                        createdAt,
                        startedAt: index === 0 ? createdAt : null,
                        finishedAt: null,
                        runDeadline: nowIso(),
                        runTimeoutSeconds: 60,
                        reason: "",
                    }
                })

                db.microtasks.push(...newMicrotasks)

                newMicrotasks.forEach((microtask) => {
                    db.microtaskLogs[microtask.microtaskId] = makeLogRecords(
                        microtask.microtaskId,
                        microtask.status
                    )
                })
            }

            writeDb(db)

            return ok(buildTaskSummaryRecord(task))
        }
    }

    const taskOutputsMatch = url.match(
        /^\/artifact-service\/api\/projects\/([^/]+)\/tasks\/([^/]+)\/outputs$/
    )

    if (taskOutputsMatch && method === "GET") {
        const [, projectId, taskId] = taskOutputsMatch
        const access = requireProjectAccess(db, projectId)

        if (access.error) {
            return access.error
        }

        const outputs = db.outputs
            .filter((item) => item.projectId === projectId && item.taskId === taskId)
            .map((item) => clone(item.meta))

        return ok({
            taskId,
            outputs,
        })
    }

    const outputContentMatch = url.match(
        /^\/artifact-service\/api\/projects\/([^/]+)\/outputs\/([^/]+)\/content$/
    )

    if (outputContentMatch && method === "GET") {
        const [, projectId, outputId] = outputContentMatch
        const access = requireProjectAccess(db, projectId)

        if (access.error) {
            return access.error
        }

        const record = db.outputs.find(
            (item) => item.projectId === projectId && item.outputId === outputId
        )

        if (!record) {
            return fail(404, {
                message: "Output не найден",
            })
        }

        return ok(makeBlob(record.content, record.meta?.contentType))
    }

    const statsMatch = url.match(
        /^\/artifact-service\/api\/projects\/([^/]+)\/tasks\/([^/]+)\/stats\/([^/]+)$/
    )

    if (statsMatch && method === "GET") {
        const [, projectId, taskId, executionTypeRaw] = statsMatch
        const access = requireProjectAccess(db, projectId)

        if (access.error) {
            return access.error
        }

        const task = findTask(db, projectId, taskId)

        if (!task) {
            return fail(404, {
                message: "Запуск не найден",
            })
        }

        const routeExecutionType = normalizeExecutionType(executionTypeRaw)
        const taskExecutionType = normalizeExecutionType(task.executionType)

        if (routeExecutionType !== taskExecutionType) {
            return failCode(
                404,
                routeExecutionType === "swarm-sync" ? "agentNotFound" : "microtaskNotFound",
                "Engine не смог выполнить запрос"
            )
        }

        return ok(buildTaskStatsPayload(db, task, routeExecutionType))
    }

    const newMicrotaskMatch = url.match(
        /^\/artifact-service\/api\/projects\/([^/]+)\/tasks\/([^/]+)\/microtasks\/stateless\/([^/]+)$/
    )

    if (newMicrotaskMatch && method === "GET") {
        const [, projectId, taskId, microtaskId] = newMicrotaskMatch
        const access = requireProjectAccess(db, projectId)

        if (access.error) {
            return access.error
        }

        const task = findTask(db, projectId, taskId)

        if (!task || normalizeExecutionType(task.executionType) !== "stateless") {
            return failCode(404, "microtaskNotFound", "Микротаска не найдена")
        }

        const microtask = findMicrotask(db, projectId, taskId, microtaskId)

        if (!microtask) {
            return failCode(404, "microtaskNotFound", "Микротаска не найдена")
        }

        return ok({
            taskId,
            microtaskId,
            displayIndex: microtask.displayIndex,
            status: normalizeEntityStatus(microtask.status),
            createdAt: microtask.createdAt,
            startedAt: microtask.startedAt,
            finishedAt: microtask.finishedAt,
            runDeadline: microtask.runDeadline,
            runTimeoutSeconds: microtask.runTimeoutSeconds,
            reason: microtask.reason ?? "",
        })
    }

    const newAgentMatch = url.match(
        /^\/artifact-service\/api\/projects\/([^/]+)\/tasks\/([^/]+)\/agents\/([^/]+)$/
    )

    if (newAgentMatch && method === "GET") {
        const [, projectId, taskId, agentId] = newAgentMatch
        const access = requireProjectAccess(db, projectId)

        if (access.error) {
            return access.error
        }

        return buildAgentPayload(db, projectId, taskId, agentId)
    }

    const legacyStateMatch = url.match(
        /^\/artifact-service\/api\/projects\/([^/]+)\/tasks\/([^/]+)\/([^/]+)\/state$/
    )

    if (legacyStateMatch && method === "GET") {
        const [, projectId, executionTypeRaw, taskId] = legacyStateMatch
        const access = requireProjectAccess(db, projectId)

        if (access.error) {
            return access.error
        }

        const task = findTask(db, projectId, taskId)

        if (!task) {
            return fail(404, {
                message: "Запуск не найден",
            })
        }

        return ok(buildLegacyTaskStatePayload(db, task, executionTypeRaw))
    }

    const legacyMicrotaskMatch = url.match(
        /^\/artifact-service\/api\/projects\/([^/]+)\/tasks\/([^/]+)\/([^/]+)\/microtasks\/([^/]+)$/
    )

    if (legacyMicrotaskMatch && method === "GET") {
        const [, projectId, executionTypeRaw, taskId, microtaskId] = legacyMicrotaskMatch
        const normalizedExecutionType = normalizeExecutionType(executionTypeRaw)

        if (normalizedExecutionType === "swarm-sync") {
            return ok({
                taskId,
                microtaskId,
                displayIndex: Number(String(microtaskId).split("-").at(-1)) || 0,
                status: "SUCCEEDED",
                createdAt: nowIso(),
                startedAt: nowIso(),
                finishedAt: nowIso(),
                runDeadline: nowIso(),
                runTimeoutSeconds: 3600,
                reason: "",
                agentId: `${taskId}-agent-0`,
                phase: "FINISH",
                iteration: 2,
            })
        }

        const access = requireProjectAccess(db, projectId)

        if (access.error) {
            return access.error
        }

        const microtask = findMicrotask(db, projectId, taskId, microtaskId)

        if (!microtask) {
            return failCode(404, "microtaskNotFound", "Микротаска не найдена")
        }

        return ok({
            taskId,
            microtaskId,
            displayIndex: microtask.displayIndex,
            status: normalizeEntityStatus(microtask.status),
            createdAt: microtask.createdAt,
            startedAt: microtask.startedAt,
            finishedAt: microtask.finishedAt,
            runDeadline: microtask.runDeadline,
            runTimeoutSeconds: microtask.runTimeoutSeconds,
            reason: microtask.reason ?? "",
        })
    }

    const legacyAgentMatch = url.match(
        /^\/artifact-service\/api\/projects\/([^/]+)\/tasks\/swarm\/([^/]+)\/agents\/([^/]+)$/
    )

    if (legacyAgentMatch && method === "GET") {
        const [, projectId, taskId, agentId] = legacyAgentMatch
        const access = requireProjectAccess(db, projectId)

        if (access.error) {
            return access.error
        }

        return buildAgentPayload(db, projectId, taskId, agentId)
    }

    const taskMatch = url.match(
        /^\/artifact-service\/api\/projects\/([^/]+)\/tasks\/([^/]+)$/
    )

    if (taskMatch) {
        const [, projectId, taskId] = taskMatch
        const access = requireProjectAccess(db, projectId)

        if (access.error) {
            return access.error
        }

        const task = findTask(db, projectId, taskId)

        if (!task) {
            return fail(404, {
                message: "Запуск не найден",
            })
        }

        if (method === "GET") {
            return ok(buildTaskSummaryRecord(task))
        }

        if (method === "PATCH") {
            task.status = "CANCELED"
            task.taskStatus = "CANCELED"
            task.finishedAt = task.finishedAt ?? nowIso()
            task.doneAt = task.doneAt ?? nowIso()

            writeDb(db)

            return ok(buildTaskSummaryRecord(task))
        }
    }

    return null
}

export const mockBaseQuery = async (args) => {
    await sleep(MOCK_LATENCY_MS)

    const db = readDb()
    const normalizedArgs = normalizeArgs(args)

    const context = {
        db,
        ...normalizedArgs,
    }

    const identityResponse = await handleIdentityService(context)

    if (identityResponse) {
        return identityResponse
    }

    const projectResponse = await handleProjectService(context)

    if (projectResponse) {
        return projectResponse
    }

    const artifactResponse = await handleArtifactService(context)

    if (artifactResponse) {
        return artifactResponse
    }

    return fail(404, {
        message: `Mock endpoint не найден: ${normalizedArgs.method} ${normalizedArgs.url}`,
    })
}