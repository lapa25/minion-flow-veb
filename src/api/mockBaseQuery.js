const MOCK_DB_KEY = "mf_mock_db_v1"
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

const normalizeArgs = (args) => {
    if (typeof args === "string") {
        return {url: args, method: "GET", params: {}, body: undefined, headers: {}}
    }
    return {
        url: args?.url ?? "",
        method: String(args?.method ?? "GET").toUpperCase(),
        params: args?.params ?? {},
        body: args?.body,
        headers: args?.headers ?? {}
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

const ok = (data) => ({data})
const fail = (status, data) => ({error: {status, data}})

const paginate = (records, pageRaw, sizeRaw) => {
    const total = records.length
    const pageIndex = Math.max(0, Number(pageRaw ?? 0) || 0)
    const pageSize = Math.max(1, Number(sizeRaw ?? 20) || 20)
    const pageCount = Math.max(1, Math.ceil(total / pageSize))
    const start = pageIndex * pageSize
    const pagedRecords = records.slice(start, start + pageSize)

    return {total, pageCount, pageSize, pageIndex, records: pagedRecords}
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

const makeArtifactMeta = ({artifactId, originalName, size, contentType, createdAt, ownerId}) => ({
    artifactId, size, originalName, contentType, createdAt, ownerId})

const makeDefaultConfig = () => ({
    type: "stateless",
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
const createInitialDb = () => {
    const ownerId = "11111111-1111-4111-8111-111111111111"
    const maintainerId = "22222222-2222-4222-8222-222222222222"
    const userId = "33333333-3333-4333-8333-333333333333"

    const projectId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    const configId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
    const artifactId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
    const inputId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"
    const taskId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"
    const outputId = "ffffffff-ffff-4fff-8fff-ffffffffffff"

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

    const configs = [
        {
            configId,
            alias: "default-config",
            projectId,
            ownerId,
            createdAt,
            config: configValue,
        },
    ]

    const artifactContent = "mock jar binary content"
    const inputContent = `{"id":1,"value":"hello"}\n{"id":2,"value":"world"}`
    const outputContent = `{"result":"ok","count":2}`

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
    ]

    const microtasks = Array.from({length: 40}, (_, i) => ({
        microtaskId: `${taskId}-microtask-${i}`,
        taskId,
        projectId,
        displayIndex: i,
        status:
            i < 3 ? "SUCCEEDED" :
                i === 3 ? "FAILED" :
                    i === 4 ? "TIME_OUT" :
                        "CREATED",
        started_at: i <= 4 ? startedAt : null,
        finished_at: i < 4 ? startedAt : null,
    }))

    return {users, projects, memberships, configs, artifacts, inputs,
        tasks, outputs, microtasks, passwordResetRequests: []}
}

const readDb = () => {
    try {
        const raw = window.localStorage.getItem(MOCK_DB_KEY)
        if (raw) {
            return JSON.parse(raw)
        }
    } catch {
        // игнор в моке
    }
    const initialDb = createInitialDb()
    window.localStorage.setItem(MOCK_DB_KEY, JSON.stringify(initialDb))
    return initialDb
}

const writeDb = (db) => {
    window.localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db))
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

const findConfig = (db, configId) =>
    db.configs.find((item) => item.configId === configId) ?? null

const findArtifact = (db, artifactId) =>
    db.artifacts.find((item) => item.artifact?.artifactId === artifactId) ?? null

const findInput = (db, artifactId) =>
    db.inputs.find((item) => item.artifact?.artifactId === artifactId) ?? null


const buildTaskSummaryRecord = (task) => ({
    taskId: task.taskId,
    projectId: task.projectId,
    launchedByUser: task.launchedByUser,
    status: task.status,
    jarId: task.jarId,
    jarAlias: task.jarAlias,
    inputId: task.inputId,
    inputAlias: task.inputAlias,
    configId: task.configId,
    configAlias: task.configAlias,
    createdAt: task.createdAt,
    startedAt: task.startedAt,
    finishedAt: task.finishedAt,
    doneAt: task.doneAt
})

const handleIdentityService = ({db, method, url, body, params}) => {
    if (url === "/identity-service/api/accounts" && method === "POST") {
        const payload = parseBody(body)
        const existingUser = db.users.find((item) =>
            item.email.toLowerCase() === String(payload?.email ?? "").toLowerCase()
        )
        if (existingUser) {
            return fail(409, {message: "Пользователь с таким email уже существует"})
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
        const user = db.users.find((item) =>
            item.email.toLowerCase() === String(payload?.email ?? "").toLowerCase()
        )
        if (!user || user.password !== payload?.password) {
            return fail(401, {message: "Неверный email или пароль"})
        }
        setSession({userId: user.userId})
        return ok({accessJWT: createAccessJwt(user.userId)})
    }

    if (url === "/identity-service/api/sessions/refresh" && method === "POST") {
        const session = getSession()
        if (!session?.userId) {
            return fail(401, {message: "Сессия не найдена"})
        }
        return ok({accessJWT: createAccessJwt(session.userId)})
    }

    if (url === "/identity-service/api/sessions/me" && method === "DELETE") {
        setSession(null)
        return ok({message: "logged out"})
    }

    if (url === "/identity-service/api/accounts/me" && method === "GET") {
        const currentUser = requireAuth(db)
        if (!currentUser) {
            return fail(401, {message: "Нужна авторизация"})
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
            return fail(401, {message: "Нужна авторизация"})
        }
        const payload = parseBody(body)
        const nextUsername = String(payload?.newUsername ?? "").trim()
        if (!nextUsername) {
            return fail(400, {message: "newUsername обязателен"})
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
            return fail(401, {message: "Нужна авторизация"})
        }
        const payload = parseBody(body)
        if (currentUser.password !== payload?.oldPassword) {
            return fail(400, {message: "Текущий пароль неверный"})
        }
        currentUser.password = String(payload?.newPassword ?? "")
        writeDb(db)
        return ok({message: "password updated"})
    }

    if (url === "/identity-service/api/account-activations" && method === "POST") {
        return ok({message: "activated", accountId: params?.accountId ?? null})
    }

    if (url === "/identity-service/api/password-resets" && method === "POST") {
        const payload = parseBody(body)
        db.passwordResetRequests.push({
            id: createId("reset"),
            email: String(payload?.email ?? "").trim(),
            createdAt: nowIso(),
        })
        writeDb(db)
        return ok({message: "reset requested"})
    }

    if (url === "/identity-service/api/password-resets" && method === "PUT") {
        return ok({message: "password reset finished"})
    }

    return null
}
const handleProjectService = ({db, method, url, body, params}) => {
    if (url === "/project-service/projects" && method === "GET") {
        const currentUser = requireAuth(db)
        if (!currentUser) {
            return fail(401, {message: "Нужна авторизация"})
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
            return fail(401, {message: "Нужна авторизация"})
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

    const projectMatch = url.match(/^\/project-service\/projects\/([^/]+)$/) || url.match(/^\/projects\/([^/]+)$/)
    if (projectMatch) {
        const [, projectId] = projectMatch
        const project = findProject(db, projectId)
        if (!project) {
            return fail(404, {message: "Проект не найден"})
        }

        if (method === "GET") {
            return ok(clone(project))
        }

        if (method === "PATCH") {
            const payload = parseBody(body)
            project.projectName = String(payload?.name ?? project.projectName).trim()
            project.projectDescription = String(
                payload?.description ?? project.projectDescription ?? ""
            ).trim()
            writeDb(db)
            return ok(clone(project))
        }

        if (method === "DELETE") {
            db.projects = db.projects.filter((item) => item.projectId !== projectId)
            db.memberships = db.memberships.filter((item) => item.projectId !== projectId)
            db.configs = db.configs.filter((item) => item.projectId !== projectId)
            db.artifacts = db.artifacts.filter((item) => item.projectId !== projectId)
            db.inputs = db.inputs.filter((item) => item.projectId !== projectId)
            db.tasks = db.tasks.filter((item) => item.projectId !== projectId)
            db.outputs = db.outputs.filter((item) => item.projectId !== projectId)
            db.microtasks = db.microtasks.filter((item) => item.projectId !== projectId)
            writeDb(db)
            return ok({message: "deleted"})
        }
    }

    const membersMatch = url.match(/^\/project-service\/projects\/([^/]+)\/members$/)
    if (membersMatch) {
        const [, projectId] = membersMatch

        if (method === "GET") {
            const records = db.memberships
                .filter((item) => item.projectId === projectId)
                .map((item) => clone(item))

            return ok(paginate(records, params?.page, params?.size))
        }

        if (method === "POST") {
            const payload = parseBody(body)
            const invitedUser = db.users.find(
                (item) => item.username.toLowerCase() === String(payload?.username ?? "").toLowerCase()
            )

            if (!invitedUser) {
                return fail(404, {message: "Пользователь не найден"})
            }

            const existingMembership = db.memberships.find(
                (item) => item.projectId === projectId && item.userId === invitedUser.userId
            )

            if (existingMembership) {
                return fail(409, {message: "Пользователь уже в проекте"})
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

    const memberMatch = url.match(/^\/project-service\/projects\/([^/]+)\/members\/([^/]+)$/)
    if (memberMatch) {
        const [, projectId, userId] = memberMatch
        const membership = db.memberships.find(
            (item) => item.projectId === projectId && item.userId === userId
        )

        if (!membership) {
            return fail(404, {message: "Участник не найден"})
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
                return fail(400, {message: "Нельзя удалить владельца проекта"})
            }

            db.memberships = db.memberships.filter(
                (item) => !(item.projectId === projectId && item.userId === userId)
            )
            writeDb(db)
            return ok({message: "removed"})
        }
    }

    return null
}
const handleArtifactService = ({db, method, url, body, params}) => {
    const configsMatch = url.match(/^\/artifact-service\/api\/projects\/([^/]+)\/executionConfigs$/)
    if (configsMatch) {
        const [, projectId] = configsMatch

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
            const currentUser = requireAuth(db)
            if (!currentUser) {
                return fail(401, {message: "Нужна авторизация"})
            }

            const payload = parseBody(body)
            const record = {
                configId: createId("config"),
                alias: String(payload?.alias ?? "").trim(),
                projectId,
                ownerId: currentUser.userId,
                createdAt: nowIso(),
                config: payload?.config ?? makeDefaultConfig(),
            }

            db.configs.push(record)
            writeDb(db)
            return ok(clone(record))
        }
    }

    const configMatch = url.match(/^\/artifact-service\/api\/projects\/([^/]+)\/executionConfigs\/([^/]+)$/)
    if (configMatch) {
        const [, projectId, configId] = configMatch
        const record = db.configs.find(
            (item) => item.projectId === projectId && item.configId === configId
        )

        if (!record) {
            return fail(404, {message: "Конфигурация не найдена"})
        }

        if (method === "GET") {
            return ok(clone(record))
        }

        if (method === "PATCH") {
            const payload = parseBody(body)
            record.alias = String(payload?.alias ?? record.alias).trim()
            record.config = payload?.config ?? record.config
            writeDb(db)
            return ok(clone(record))
        }

        if (method === "DELETE") {
            db.configs = db.configs.filter((item) => item.configId !== configId)
            writeDb(db)
            return ok({message: "deleted"})
        }
    }

    const artifactsMatch = url.match(/^\/artifact-service\/api\/projects\/([^/]+)\/artifacts$/)
    if (artifactsMatch) {
        const [, projectId] = artifactsMatch

        if (method === "GET") {
            const records = db.artifacts
                .filter((item) => item.projectId === projectId)
                .map((item) => clone({
                    alias: item.alias,
                    artifact: item.artifact,
                }))

            return ok(paginate(records, params?.page, params?.size))
        }

        if (method === "POST") {
            const currentUser = requireAuth(db)
            if (!currentUser) {
                return fail(401, {message: "Нужна авторизация"})
            }

            const payload = parseBody(body)
            const file = payload?.file
            const content = `mock content for ${file?.name ?? "artifact.jar"}`
            const artifactId = createId("artifact")
            const record = {
                projectId,
                alias: String(payload?.alias ?? "").trim(),
                artifact: makeArtifactMeta({
                    artifactId,
                    originalName: file?.name ?? "artifact.jar",
                    size: file?.size ?? content.length,
                    contentType: file?.type || "application/java-archive",
                    createdAt: nowIso(),
                    ownerId: currentUser.userId,
                }),
                content,
            }

            db.artifacts.push(record)
            writeDb(db)
            return ok(clone({alias: record.alias, artifact: record.artifact}))
        }
    }

    const artifactMatch = url.match(/^\/artifact-service\/api\/projects\/([^/]+)\/artifacts\/([^/]+)$/)
    if (artifactMatch) {
        const [, projectId, artifactId] = artifactMatch
        const record = db.artifacts.find(
            (item) => item.projectId === projectId && item.artifact.artifactId === artifactId
        )

        if (!record) {
            return fail(404, {message: "Артефакт не найден"})
        }

        if (method === "GET") {
            return ok(clone({alias: record.alias, artifact: record.artifact}))
        }

        if (method === "PATCH") {
            const payload = parseBody(body)
            record.alias = typeof payload === "string" ? payload : String(payload?.alias ?? record.alias).trim()
            writeDb(db)
            return ok(clone({alias: record.alias, artifact: record.artifact}))
        }

        if (method === "DELETE") {
            db.artifacts = db.artifacts.filter((item) => item.artifact.artifactId !== artifactId)
            writeDb(db)
            return ok({message: "deleted"})
        }
    }

    const artifactContentMatch = url.match(/^\/artifact-service\/api\/projects\/([^/]+)\/artifacts\/([^/]+)\/content$/)
    if (artifactContentMatch) {
        const [, projectId, artifactId] = artifactContentMatch
        const record = db.artifacts.find(
            (item) => item.projectId === projectId && item.artifact.artifactId === artifactId
        )

        if (!record) {
            return fail(404, {message: "Артефакт не найден"})
        }

        if (method === "GET") {
            return ok(new Blob([record.content ?? ""], {type: record.artifact.contentType || "application/octet-stream"}))
        }

        if (method === "PUT") {
            const payload = parseBody(body)
            const file = payload?.file
            record.content = `mock content for ${file?.name ?? record.artifact.originalName}`
            record.artifact.originalName = file?.name ?? record.artifact.originalName
            record.artifact.size = file?.size ?? record.content.length
            record.artifact.contentType = file?.type || record.artifact.contentType
            writeDb(db)
            return ok(clone({alias: record.alias, artifact: record.artifact}))
        }
    }

    const inputsMatch = url.match(/^\/artifact-service\/api\/projects\/([^/]+)\/inputs$/)
    if (inputsMatch) {
        const [, projectId] = inputsMatch

        if (method === "GET") {
            const records = db.inputs
                .filter((item) => item.projectId === projectId)
                .map((item) => clone({
                    alias: item.alias,
                    inputType: item.inputType,
                    artifact: item.artifact,
                }))

            return ok(paginate(records, params?.page, params?.size))
        }

        if (method === "POST") {
            const currentUser = requireAuth(db)
            if (!currentUser) {
                return fail(401, {message: "Нужна авторизация"})
            }

            const payload = parseBody(body)
            const file = payload?.file
            const content = `{"mock":true,"name":"${file?.name ?? "input.jsonl"}"}`
            const artifactId = createId("input")
            const record = {
                projectId,
                alias: String(payload?.alias ?? "").trim(),
                inputType: payload?.inputType ?? "JSONL",
                artifact: makeArtifactMeta({
                    artifactId,
                    originalName: file?.name ?? "input.jsonl",
                    size: file?.size ?? content.length,
                    contentType: file?.type || "application/x-ndjson",
                    createdAt: nowIso(),
                    ownerId: currentUser.userId,
                }),
                content,
            }

            db.inputs.push(record)
            writeDb(db)
            return ok(clone({
                alias: record.alias,
                inputType: record.inputType,
                artifact: record.artifact,
            }))
        }
    }

    const inputMatch = url.match(/^\/artifact-service\/api\/projects\/([^/]+)\/inputs\/([^/]+)$/)
    if (inputMatch) {
        const [, projectId, artifactId] = inputMatch
        const record = db.inputs.find(
            (item) => item.projectId === projectId && item.artifact.artifactId === artifactId
        )

        if (!record) {
            return fail(404, {message: "Input не найден"})
        }

        if (method === "GET") {
            return ok(clone({
                alias: record.alias,
                inputType: record.inputType,
                artifact: record.artifact,
            }))
        }

        if (method === "PATCH") {
            const payload = parseBody(body)
            record.alias = String(payload?.alias ?? record.alias).trim()
            record.inputType = payload?.inputType ?? record.inputType
            writeDb(db)
            return ok(clone({
                alias: record.alias,
                inputType: record.inputType,
                artifact: record.artifact,
            }))
        }

        if (method === "DELETE") {
            db.inputs = db.inputs.filter((item) => item.artifact.artifactId !== artifactId)
            writeDb(db)
            return ok({message: "deleted"})
        }
    }

    const inputContentMatch = url.match(/^\/artifact-service\/api\/projects\/([^/]+)\/inputs\/([^/]+)\/content$/)
    if (inputContentMatch) {
        const [, projectId, artifactId] = inputContentMatch
        const record = db.inputs.find(
            (item) => item.projectId === projectId && item.artifact.artifactId === artifactId
        )

        if (!record) {
            return fail(404, {message: "Input не найден"})
        }

        if (method === "GET") {
            return ok(new Blob([record.content ?? ""], {type: record.artifact.contentType || "application/octet-stream"}))
        }

        if (method === "PUT") {
            const payload = parseBody(body)
            const file = payload?.file
            record.content = `{"mock":true,"name":"${file?.name ?? record.artifact.originalName}"}`
            record.artifact.originalName = file?.name ?? record.artifact.originalName
            record.artifact.size = file?.size ?? record.content.length
            record.artifact.contentType = file?.type || record.artifact.contentType
            writeDb(db)
            return ok(clone({
                alias: record.alias,
                inputType: record.inputType,
                artifact: record.artifact,
            }))
        }
    }

    const tasksMatch = url.match(/^\/artifact-service\/api\/projects\/([^/]+)\/tasks$/)
    if (tasksMatch) {
        const [, projectId] = tasksMatch

        if (method === "GET") {
            const records = db.tasks
                .filter((item) => item.projectId === projectId)
                .map((item) => clone(buildTaskSummaryRecord(item)))

            return ok(paginate(records, params?.page, params?.size))
        }

        if (method === "POST") {
            const currentUser = requireAuth(db)
            if (!currentUser) {
                return fail(401, {message: "Нужна авторизация"})
            }

            const payload = parseBody(body)
            const jar = findArtifact(db, payload?.jarId)
            const input = findInput(db, payload?.inputId)
            const config = findConfig(db, payload?.configId)

            if (!jar || !input || !config) {
                return fail(400, {message: "Некорректные jarId / inputId / configId"})
            }

            const taskId = createId("task")
            const createdAt = nowIso()

            const task = {
                taskId,
                projectId,
                launchedByUser: currentUser.userId,
                status: "RUNNING",
                jarId: jar.artifact.artifactId,
                jarAlias: jar.alias,
                inputId: input.artifact.artifactId,
                inputAlias: input.alias,
                configId: config.configId,
                configAlias: config.alias,
                createdAt,
                startedAt: createdAt,
                finishedAt: null,
                doneAt: null,
                launchSnapshot: clone(config.config),
            }
            db.tasks.unshift(task)

            for (let i = 0; i < 40; ++i) {
                db.microtasks.push({
                    microtaskId: `${taskId}-microtask-${i}`,
                    taskId,
                    projectId,
                    displayIndex: i,
                    status: i < 3 ? "SUCCEEDED" : i === 3 ? "RUNNING" : "CREATED",
                    started_at: i <= 3 ? createdAt : null,
                    finished_at: i < 3 ? createdAt : null,
                })
            }
            writeDb(db)
            return ok(clone(buildTaskSummaryRecord(task)))
        }
    }

    const taskMatch = url.match(/^\/artifact-service\/api\/projects\/([^/]+)\/tasks\/([^/]+)$/)
    if (taskMatch) {
        const [, projectId, taskId] = taskMatch
        const task = db.tasks.find((item) => item.projectId === projectId && item.taskId === taskId)

        if (!task) {
            return fail(404, {message: "Запуск не найден"})
        }

        if (method === "GET") {
            return ok(clone({
                ...buildTaskSummaryRecord(task),
                launchSnapshot: task.launchSnapshot ?? null,
            }))
        }

        if (method === "PATCH") {
            task.status = "CANCELED"
            task.finishedAt = nowIso()
            task.doneAt = task.finishedAt
            writeDb(db)
            return ok({message: "canceled"})
        }
    }

    const taskOutputsMatch = url.match(/^\/artifact-service\/api\/projects\/([^/]+)\/tasks\/([^/]+)\/outputs$/)
    if (taskOutputsMatch) {
        const [, projectId, taskId] = taskOutputsMatch
        const outputs = db.outputs
            .filter((item) => item.projectId === projectId && item.taskId === taskId)
            .map((item) => clone(item.meta))

        return ok({outputs})
    }

    const outputMetaMatch = url.match(/^\/artifact-service\/api\/projects\/([^/]+)\/outputs\/([^/]+)$/)
    if (outputMetaMatch && method === "GET") {
        const [, projectId, outputId] = outputMetaMatch
        const output = db.outputs.find(
            (item) => item.projectId === projectId && item.meta.artifactId === outputId
        )

        if (!output) {
            return fail(404, {message: "Output не найден"})
        }

        return ok(clone(output.meta))
    }

    const outputContentMatch = url.match(/^\/artifact-service\/api\/projects\/([^/]+)\/outputs\/([^/]+)\/content$/)
    if (outputContentMatch && method === "GET") {
        const [, projectId, outputId] = outputContentMatch
        const output = db.outputs.find(
            (item) => item.projectId === projectId && item.meta.artifactId === outputId
        )

        if (!output) {
            return fail(404, {message: "Output не найден"})
        }

        return ok(new Blob([output.content ?? ""], {type: output.meta.contentType || "application/octet-stream"}))
    }

    const microtaskMatch = url.match(/^\/artifact-service\/api\/projects\/([^/]+)\/tasks\/([^/]+)\/microtasks\/([^/]+)$/)
    if (microtaskMatch && method === "GET") {
        const [, projectId, taskId, microtaskId] = microtaskMatch
        const microtask = db.microtasks.find(
            (item) =>
                item.projectId === projectId &&
                item.taskId === taskId &&
                item.microtaskId === microtaskId
        )

        if (!microtask) {
            return fail(404, {message: "Микрозадача не найдена"})
        }

        return ok(clone(microtask))
    }

    return null
}
export const mockBaseQuery = async (args) => {
    await sleep(MOCK_LATENCY_MS)

    const request = normalizeArgs(args)
    const db = readDb()

    const authResult = handleIdentityService({db, method: request.method, url: request.url,
        body: request.body, params: request.params})
    if (authResult) {
        return authResult
    }

    const projectResult = handleProjectService({db, method: request.method, url: request.url,
        body: request.body, params: request.params,})
    if (projectResult) {
        return projectResult
    }

    const artifactResult = handleArtifactService({db, method: request.method, url: request.url,
        body: request.body, params: request.params})
    if (artifactResult) {
        return artifactResult
    }

    return fail(404, {
        message: `Mock route not found: ${request.method} ${request.url}`,
    })
}
