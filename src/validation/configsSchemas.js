import { z } from "zod"

const CPU_PATTERN = /^(\d+m|\d+(?:\.\d+)?)$/i
const MEMORY_PATTERN = /^\d+(?:Mi|Gi)$/i

const SCHEDULING_MODES = ["asp", "fixed"]
const EXECUTION_TYPES = ["stateless", "stateful"]
const WORKER_BOUNDS = ["cpu", "io"]

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
    maxParallelism: optionalPositiveInt,
    minParallelism: optionalPositiveInt,
    parallelism: optionalPositiveInt
})

const executionConfigSchema = z.object({
    type: z.enum(EXECUTION_TYPES, {
        error: () => ({ message: "type должен быть stateless или stateful" }),
    }).optional(),

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
    const microtaskSeconds = data.config?.timeouts?.microtaskSeconds
    const taskSeconds = data.config?.timeouts?.taskSeconds
    const baseMs = data.config?.retry?.backoff?.baseMs
    const maxMs = data.config?.retry?.backoff?.maxMs

    if (microtaskSeconds !== undefined && taskSeconds !== undefined &&
        microtaskSeconds > taskSeconds) {
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
    const scheduling = data.config?.scheduling
    if (scheduling.mode === "asp") {
        if (scheduling.minParallelism === undefined) {
            form.addIssue({
                code: "custom",
                path: ["spec", "execution", "scheduling", "minParallelism"],
                message: "Для mode=asp укажите minParallelism"
            })
        }
        if (scheduling.maxParallelism === undefined) {
            form.addIssue({
                code: "custom",
                path: ["spec", "execution", "scheduling", "maxParallelism"],
                message: "Для mode=asp укажите maxParallelism"
            })
        }
        if (scheduling.minParallelism !== undefined &&
            scheduling.maxParallelism !== undefined &&
            scheduling.minParallelism > scheduling.maxParallelism) {
            form.addIssue({
                code: "custom",
                path: ["spec", "execution", "scheduling", "maxParallelism"],
                message: "maxParallelism должен быть больше либо равен minParallelism",
            })
        }
    }
    if (scheduling.mode === "fixed" && scheduling.parallelism === undefined) {
        form.addIssue({
            code: "custom",
            path: ["spec", "execution", "scheduling", "parallelism"],
            message: "Для mode=fixed укажите parallelism"
        })
    }
}

export const configFormSchema = baseConfigFormSchema.superRefine(validateConfigForm)

export const configFormDefaultValues = {
    alias: "",
    config: {
        type: "stateless",
        scheduling: {
            mode: "asp",
            maxParallelism: 200,
            minParallelism: 1,
            parallelism: undefined
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
    const sch = data.config.scheduling.mode === "asp"
            ? {
                mode: "asp",
                maxParallelism: data.config.scheduling.maxParallelism,
                minParallelism: data.config.scheduling.minParallelism
            }
            : {
                mode: "fixed",
                parallelism: data.config.scheduling.parallelism
            }
    return compactObject({
        alias: data.alias,
        config: data.config
            ? {
                type: data.config.type,
                scheduling: sch,
                worker: data.config.worker
                    ? {
                        bound: data.config.worker.bound,
                        concurrency: data.config.worker.concurrency,
                        resources: data.config.worker.resources
                            ? {
                                cpu: data.config.worker.resources.cpu,
                                memory: data.config.worker.resources.memory,
                            }
                            : undefined,
                    }
                    : undefined,
                timeouts: data.config.timeouts
                    ? {
                        microtaskSeconds: data.config.timeouts.microtaskSeconds,
                        taskSeconds: data.config.timeouts.taskSeconds,
                    }
                    : undefined,
                retry: data.config.retry
                    ? {
                        maxAttempts: data.config.retry.maxAttempts,
                        backoff: data.config.retry.backoff
                            ? {
                                strategy: data.config.retry.backoff.strategy,
                                baseMs: data.config.retry.backoff.baseMs,
                                maxMs: data.config.retry.backoff.maxMs,
                                jitter: data.config.retry.backoff.jitter,
                            }
                            : undefined,
                    }
                    : undefined,
            }
            : undefined,
    })
}