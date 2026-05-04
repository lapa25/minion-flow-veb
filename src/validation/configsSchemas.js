import { z } from "zod"

const CPU_PATTERN = /^(\d+m|\d+(?:\.\d+)?)$/i
const MEMORY_PATTERN = /^\d+(?:Mi|Gi)$/i

const SCHEDULING_MODES = ["asp", "fixed"]
const EXECUTION_TYPES = ["stateless", "swarm"]
const WORKER_BOUNDS = ["cpu", "io"]
const TOPOLOGY_TYPES = ["ring"]

const emptyToUndefined = (value) => {
    if (value === null || value === undefined) {
        return undefined
    }
    if (typeof value === "string" && value.trim() === "") {
        return undefined
    }
    return value
}

const optionalPositiveInt = z.preprocess(
    emptyToUndefined,
    z.coerce.number()
        .int("Должно быть целым числом")
        .positive("Должно быть больше 0")
        .optional()
)

const optionalNonNegativeInt = z.preprocess(
    emptyToUndefined,
    z.coerce.number()
        .int("Должно быть целым числом")
        .min(0, "Значение не может быть отрицательным")
        .optional()
)

const workerResourcesSchema = z.object({
    cpu: z.string().trim()
        .min(1, "CPU обязателен")
        .regex(CPU_PATTERN, "CPU должен быть в формате 500m, 1 или 2"),
    memory: z.string().trim()
        .min(1, "memory обязателен")
        .regex(MEMORY_PATTERN, "memory должна быть в формате 512Mi или 2Gi"),
})

const backoffSchema = z.object({
    strategy: z.string().trim().min(1, "strategy обязателен"),
    baseMs: optionalNonNegativeInt,
    maxMs: optionalNonNegativeInt,
    jitter: z.boolean().optional(),
})

const schedulingSchema = z.object({
    mode: z.enum(SCHEDULING_MODES, {
        error: () => ({ message: "Неизвестный scheduling.mode" }),
    }),
    batchSize: optionalPositiveInt,
    maxParallelism: optionalPositiveInt,
    minParallelism: optionalPositiveInt,
    parallelism: optionalPositiveInt
})

const swarmSchema = z.object({
    iterations: optionalPositiveInt,
    agentCount: optionalPositiveInt,
    topology: z.object({
        type: z.enum(TOPOLOGY_TYPES, {
            error: () => ({ message: "Пока поддерживается только topology.type=ring" }),
        }),
        numberOfNeighbors: optionalPositiveInt,
    }).optional(),
}).optional()

const executionConfigSchema = z.object({
    type: z.enum(EXECUTION_TYPES, {
        error: () => ({ message: "type должен быть stateless или swarm" }),
    }).optional(),

    swarm: swarmSchema,

    scheduling: schedulingSchema,

    worker: z.object({
        bound: z.enum(WORKER_BOUNDS, {
            error: () => ({ message: "bound должен быть cpu или io" }),
        }).optional(),
        concurrency: optionalNonNegativeInt,
        resources: workerResourcesSchema.optional(),
    }).optional(),

    timeouts: z.object({
        microtaskSeconds: optionalNonNegativeInt,
        taskSeconds: optionalNonNegativeInt,
    }).optional(),

    retry: z.object({
        maxAttempts: optionalNonNegativeInt,
        backoff: backoffSchema.optional(),
    }).optional(),
})

export const baseConfigFormSchema = z.object({
    alias: z.string().trim()
        .min(1, "alias обязателен")
        .max(100, "alias должен быть не длиннее 100 символов"),
    config: executionConfigSchema.optional(),
})

const validateConfigForm = (data, form) => {
    const config = data.config
    if (!config) {
        return
    }

    const microtaskSeconds = config.timeouts?.microtaskSeconds
    const taskSeconds = config.timeouts?.taskSeconds
    const baseMs = config.retry?.backoff?.baseMs
    const maxMs = config.retry?.backoff?.maxMs

    if (
        microtaskSeconds !== undefined &&
        taskSeconds !== undefined &&
        microtaskSeconds > taskSeconds
    ) {
        form.addIssue({
            code: "custom",
            path: ["config", "timeouts", "microtaskSeconds"],
            message: "microtaskSeconds не должен быть больше taskSeconds",
        })
    }

    if (baseMs !== undefined && maxMs !== undefined && maxMs < baseMs) {
        form.addIssue({
            code: "custom",
            path: ["config", "retry", "backoff", "maxMs"],
            message: "maxMs не должен быть меньше baseMs",
        })
    }

    const scheduling = config.scheduling
    if (scheduling?.mode === "asp") {
        if (scheduling.minParallelism === undefined) {
            form.addIssue({
                code: "custom",
                path: ["config", "scheduling", "minParallelism"],
                message: "Для mode=asp укажите minParallelism"
            })
        }
        if (scheduling.maxParallelism === undefined) {
            form.addIssue({
                code: "custom",
                path: ["config", "scheduling", "maxParallelism"],
                message: "Для mode=asp укажите maxParallelism"
            })
        }
        if (scheduling.minParallelism !== undefined &&
            scheduling.maxParallelism !== undefined &&
            scheduling.minParallelism > scheduling.maxParallelism) {
            form.addIssue({
                code: "custom",
                path: ["config", "scheduling", "maxParallelism"],
                message: "maxParallelism должен быть больше либо равен minParallelism",
            })
        }
    }
    if (scheduling.mode === "fixed" && scheduling.parallelism === undefined) {
        form.addIssue({
            code: "custom",
            path: ["config", "scheduling", "parallelism"],
            message: "Для mode=fixed укажите parallelism"
        })
    }
    if (config.type === "swarm") {
        if (config.swarm?.iterations === undefined) {
            form.addIssue({
                code: "custom",
                path: ["config", "swarm", "iterations"],
                message: "Для swarm укажите iterations",
            })
        }
        if (config.swarm?.agentCount === undefined) {
            form.addIssue({
                code: "custom",
                path: ["config", "swarm", "agentCount"],
                message: "Для swarm укажите agentCount",
            })
        }
        if (!config.swarm?.topology?.type) {
            form.addIssue({
                code: "custom",
                path: ["config", "swarm", "topology", "type"],
                message: "Для swarm укажите topology.type",
            })
        }
        if (config.swarm?.topology?.numberOfNeighbors === undefined) {
            form.addIssue({
                code: "custom",
                path: ["config", "swarm", "topology", "numberOfNeighbors"],
                message: "Для swarm укажите общее число соседей",
            })
        }
    }
}

export const configFormSchema = baseConfigFormSchema.superRefine(validateConfigForm)

export const configFormDefaultValues = {
    alias: "",
    config: {
        type: "stateless",
        swarm: {
            iterations: 10,
            agentCount: 10000,
            topology: {
                type: "ring",
                numberOfNeighbors: 4,
            },
        },
        scheduling: {
            mode: "asp",
            batchSize: 12,
            maxParallelism: 200,
            minParallelism: 1,
            parallelism: undefined,
        },
        worker: {
            bound: "cpu",
            concurrency: 1,
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
    },
}

const mergeObjects = (base, extra) => {
    if (Array.isArray(base) || Array.isArray(extra)) {
        return extra ?? base
    }
    if (
        typeof base !== "object" || base === null ||
        typeof extra !== "object" || extra === null
    ) {
        return extra ?? base
    }
    const result = { ...base }
    for (const key of Object.keys(extra)) {
        result[key] = mergeObjects(base[key], extra[key])
    }
    return result
}

const compactObject = (value) => {
    if (Array.isArray(value)) {
        return value.map(compactObject)
    }
    if (typeof value !== "object" || value === null) {
        return value
    }
    const entries = Object.entries(value)
        .map(([key, item]) => [key, compactObject(item)])
        .filter(([, item]) => item !== undefined)
    return Object.fromEntries(entries)
}

export const toConfigFormValues = (dto = {}) => {
    const mergedConfig = mergeObjects(
        configFormDefaultValues.config,
        dto?.config ?? {}
    )
    return {
        alias: dto?.alias ?? "",
        config: mergedConfig,
    }
}

export const toConfigPayload = (values) => {
    const data = configFormSchema.parse(values)
    const config = data.config
    const scheduling = config.scheduling.mode === "asp"
        ? {
            mode: "asp",
            batchSize: config.scheduling.batchSize,
            maxParallelism: config.scheduling.maxParallelism,
            minParallelism: config.scheduling.minParallelism,
        }
        : {
            mode: "fixed",
            batchSize: config.scheduling.batchSize,
            parallelism: config.scheduling.parallelism,
        }
    return compactObject({
        alias: data.alias,
        config: config
            ? {
                type: config.type,
                swarm: config.type === "swarm"
                    ? {
                        iterations: config.swarm?.iterations,
                        agentCount: config.swarm?.agentCount,
                        topology: {
                            type: config.swarm?.topology?.type,
                            numberOfNeighbors: config.swarm?.topology?.numberOfNeighbors,
                        },
                    }
                    : undefined,
                scheduling,
                worker: config.worker
                    ? {
                        bound: config.worker.bound,
                        concurrency: config.worker.concurrency,
                        resources: config.worker.resources
                            ? {
                                cpu: config.worker.resources.cpu,
                                memory: config.worker.resources.memory,
                            }
                            : undefined,
                    }
                    : undefined,
                timeouts: config.timeouts
                    ? {
                        microtaskSeconds: config.timeouts.microtaskSeconds,
                        taskSeconds: config.timeouts.taskSeconds,
                    }
                    : undefined,
                retry: config.retry
                    ? {
                        maxAttempts: config.retry.maxAttempts,
                        backoff: config.retry.backoff
                            ? {
                                strategy: config.retry.backoff.strategy,
                                baseMs: config.retry.backoff.baseMs,
                                maxMs: config.retry.backoff.maxMs,
                                jitter: config.retry.backoff.jitter,
                            }
                            : undefined,
                    }
                    : undefined,
            }
            : undefined,
    })
}