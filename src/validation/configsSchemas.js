import {z} from "zod"

const CPU_PATTERN = /^(\d+m|\d+(?:\.\d+)?)$/i
const MEMORY_PATTERN = /^\d+(?:Mi|Gi)$/i

const SCHEDULING_MODES = ["asp", "fixed"]
const EXECUTION_TYPES = ["stateless", "stateful"]
const WORKER_BOUNDS = ["cpu", "io"]
const BACKOFF_STRATEGIES = ["fixed", "linear", "exponential"]

const emptyToUndefined = (value) => {
    if (value === null || value === undefined) {
        return undefined
    }
    if (typeof value === "string" && value.trim() === "") {
        return undefined
    }
    return value
}

const requiredTrimmedString = (requiredMessage) =>
    z.string().trim().min(1, requiredMessage)

const optionalTrimmedString = (max = 500,
    tooLongMessage = "Слишком длинное значение") =>
    z.preprocess(
        emptyToUndefined,
        z.string().trim().max(max, tooLongMessage).optional()
    )

const optionalPositiveInt = z.preprocess(
    emptyToUndefined,
    z.coerce.number()
        .int("Должно быть целым числом")
        .positive("Должно быть больше 0")
        .optional()
)

const optionalNonNegativeNumber = z.preprocess(
    emptyToUndefined,
    z.coerce.number()
        .min(0, "Значение не может быть отрицательным")
        .optional()
)

const optionalPercent = z.preprocess(
    emptyToUndefined,
    z.coerce.number()
        .min(0, "Процент не может быть меньше 0")
        .max(100, "Процент не может быть больше 100")
        .optional()
)

const schedulingSchema = z.object({
    mode: z.enum(SCHEDULING_MODES, {
        error: () => ({ message: "Неизвестный scheduling.mode" }),
    }),
    maxParallelism: optionalPositiveInt,
    minParallelism: optionalPositiveInt,
    parallelism: optionalPositiveInt
})

const executionSchema = z.object({
    type: z.enum(EXECUTION_TYPES, {
        error: () => ({ message: "Неизвестный execution.type" })
    }),

    scheduling: schedulingSchema,

    worker: z.object({
        bound: z.enum(WORKER_BOUNDS, {
            error: () => ({ message: "bound должен быть cpu или io" }),
        }),
        concurrency: z.coerce.number()
            .int("concurrency должен быть целым числом")
            .positive("concurrency должен быть больше 0"),
        resources: z.object({
            cpu: z.string().trim()
                .regex(CPU_PATTERN, "CPU должен быть в формате 500m, 1 или 2"),
            memory: z.string().trim()
                .regex(MEMORY_PATTERN, "memory должна быть в формате 512Mi или 2Gi")
        }),
    }),

    timeouts: z.object({
        taskSeconds: z.coerce.number()
            .int("taskSeconds должен быть целым числом")
            .positive("taskSeconds должен быть больше 0"),
        runSeconds: z.coerce.number()
            .int("runSeconds должен быть целым числом")
            .positive("runSeconds должен быть больше 0"),
    }),

    retry: z.object({
        maxAttempts: z.coerce.number()
            .int("maxAttempts должен быть целым числом")
            .min(0, "maxAttempts не может быть отрицательным"),
        backoff: z.object({
            strategy: z.enum(BACKOFF_STRATEGIES, {
                error: () => ({ message: "Неизвестная стратегия backoff" })
            }),
            baseMs: z.coerce.number()
                .int("baseMs должен быть целым числом")
                .min(0, "baseMs не может быть отрицательным"),
            maxMs: z.coerce.number()
                .int("maxMs должен быть целым числом")
                .min(0, "maxMs не может быть отрицательным"),
            jitter: z.boolean()
        }),
    }),

    limits: z.object({
        maxErrorRatePct: optionalPercent,
        maxBudgetRub: optionalNonNegativeNumber,
        deadlineAt: optionalTrimmedString()
    }),
})

const baseConfigFormSchema = z.object({
    name: z.string().trim()
        .min(2, "Название должно быть не короче 2 символов")
        .max(64, "Название должно быть не длиннее 64 символов"),

    description: z.string().trim()
        .max(1000, "Описание должно быть не длиннее 1000 символов")
        .optional()
        .or(z.literal("")),

    spec: z.object({
        projectId: requiredTrimmedString("projectId обязателен"),
        userId: requiredTrimmedString("userId обязателен"),

        execution: executionSchema,

        input: z.object({
            type: requiredTrimmedString("input.type обязателен"),
            source: z.object({
                bucket: requiredTrimmedString("input.source.bucket обязателен"),
                key: requiredTrimmedString("input.source.key обязателен")
            }),
        }),

        output: z.object({
            destination: z.object({
                type: requiredTrimmedString("output.destination.type обязателен"),
                bucket: requiredTrimmedString("output.destination.bucket обязателен"),
                prefix: requiredTrimmedString("output.destination.prefix обязателен")
            }),
            perTask: z.object({
                dirTemplate: requiredTrimmedString("output.perTask.dirTemplate обязателен"),
                result: z.object({
                    format: requiredTrimmedString("output.perTask.result.format обязателен"),
                    filename: requiredTrimmedString("output.perTask.result.filename обязателен")
                }),
            }),
        }),

        artifacts: z.object({
            uploadFromWorkDir: requiredTrimmedString("artifacts.uploadFromWorkDir обязателен"),
            pathTemplate: requiredTrimmedString("artifacts.pathTemplate обязателен")
        }),

        security: z.object({
            network: z.object({
                allowDomainsText: z.string()
                    .max(4000, "Список доменов слишком длинный")
                    .optional()
                    .or(z.literal(""))
            }),
        }),
    }),
})

const validateConfigForm = (data, form) => {
    const scheduling = data.spec.execution.scheduling
    const timeouts = data.spec.execution.timeouts
    const backoff = data.spec.execution.retry.backoff

    if (timeouts.taskSeconds > timeouts.runSeconds) {
        form.addIssue({
            code: "custom",
            path: ["spec", "execution", "timeouts", "taskSeconds"],
            message: "taskSeconds не должен быть больше runSeconds"
        })
    }

    if (backoff.maxMs < backoff.baseMs) {
        form.addIssue({
            code: "custom",
            path: ["spec", "execution", "retry", "backoff", "maxMs"],
            message: "maxMs не должен быть меньше baseMs"
        })
    }

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
    name: "",
    description: "",
    spec: {
        projectId: "",
        userId: "",
        execution: {
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
                    memory: "512Mi"
                },
            },
            timeouts: {
                taskSeconds: 60,
                runSeconds: 3600
            },
            retry: {
                maxAttempts: 3,
                backoff: {
                    strategy: "exponential",
                    baseMs: 500,
                    maxMs: 10000,
                    jitter: true
                },
            },
            limits: {
                maxErrorRatePct: undefined,
                maxBudgetRub: undefined,
                deadlineAt: undefined
            },
        },
        input: {
            type: "jsonl",
            source: {
                bucket: "datasets",
                key: "path/to/tasks.jsonl"
            },
        },
        output: {
            destination: {
                type: "s3",
                bucket: "results",
                prefix: "prj_123/run123/"
            },
            perTask: {
                dirTemplate: "tasks/{task_id}/",
                result: {
                    format: "json",
                    filename: "result.json"
                },
            },
        },
        artifacts: {
            uploadFromWorkDir: "./out/",
            pathTemplate: "tasks/{task_id}/artifacts/"
        },
        security: {
            network: {
                allowDomainsText: "yandex.ru\ngoogle.com"
            },
        },
    },
}

export const splitText = (value) =>
    String(value ?? "")
        .split(/[\n,]+/g)
        .map((item) => item.trim())
        .filter(Boolean)

export const joinText = (value) => {
    if (!Array.isArray(value) || value.length === 0) {
        return ""
    }

    return value
        .map((item) => String(item).trim())
        .filter(Boolean)
        .join("\n")
}

const isObj = (value) =>
    typeof value === "object" && value !== null && !Array.isArray(value)

const mergeWithDefaults = (defaults, source) => {
    if (!isObj(defaults) || !isObj(source)) {
        return source ?? defaults
    }
    const result = { ...defaults }
    for (const key of Object.keys(defaults)) {
        result[key] = mergeWithDefaults(defaults[key], source[key])
    }
    return result
}

const makeObj = (obj) =>
    Object.fromEntries(
        Object.entries(obj).filter(([, value]) => value !== undefined)
    )

export const toConfigFormValues = (input = {}) => {
    const spec = input?.spec ?? input
    const mergedSpec = mergeWithDefaults(configFormDefaultValues.spec, spec)

    const rawNetwork = spec?.security?.network
    const allowDomainsText =
        rawNetwork?.allowDomainsText ??
        (Array.isArray(rawNetwork?.allowDomains)
            ? joinText(rawNetwork.allowDomains)
            : configFormDefaultValues.spec.security.network.allowDomainsText)

    return {
        name: input?.name ?? configFormDefaultValues.name,
        description: input?.description ?? configFormDefaultValues.description,
        spec: {
            ...mergedSpec,
            security: {
                ...mergedSpec.security,
                network: {
                    ...mergedSpec.security.network,
                    allowDomainsText
                },
            },
        },
    }
}

export const toConfigPayload = (values) => {
    const data = configFormSchema.parse(values)
    const allowDomains = splitText(data.spec.security.network.allowDomainsText)

    const scheduling =
        data.spec.execution.scheduling.mode === "asp"
            ? {
                mode: "asp",
                maxParallelism: data.spec.execution.scheduling.maxParallelism,
                minParallelism: data.spec.execution.scheduling.minParallelism
            }
            : {
                mode: "fixed",
                parallelism: data.spec.execution.scheduling.parallelism
            }

    const limits = makeObj({
        maxErrorRatePct: data.spec.execution.limits.maxErrorRatePct,
        maxBudgetRub: data.spec.execution.limits.maxBudgetRub,
        deadlineAt: data.spec.execution.limits.deadlineAt
    })

    return {
        name: data.name,
        description: data.description ? data.description : null,
        spec: {
            projectId: data.spec.projectId,
            userId: data.spec.userId,

            execution: {
                type: data.spec.execution.type,
                scheduling,
                worker: {
                    bound: data.spec.execution.worker.bound,
                    concurrency: data.spec.execution.worker.concurrency,
                    resources: {
                        cpu: data.spec.execution.worker.resources.cpu,
                        memory: data.spec.execution.worker.resources.memory
                    },
                },
                timeouts: {
                    taskSeconds: data.spec.execution.timeouts.taskSeconds,
                    runSeconds: data.spec.execution.timeouts.runSeconds
                },
                retry: {
                    maxAttempts: data.spec.execution.retry.maxAttempts,
                    backoff: {
                        strategy: data.spec.execution.retry.backoff.strategy,
                        baseMs: data.spec.execution.retry.backoff.baseMs,
                        maxMs: data.spec.execution.retry.backoff.maxMs,
                        jitter: data.spec.execution.retry.backoff.jitter
                    },
                },
                limits,
            },

            input: {
                type: data.spec.input.type,
                source: {
                    bucket: data.spec.input.source.bucket,
                    key: data.spec.input.source.key
                },
            },

            output: {
                destination: {
                    type: data.spec.output.destination.type,
                    bucket: data.spec.output.destination.bucket,
                    prefix: data.spec.output.destination.prefix
                },
                perTask: {
                    dirTemplate: data.spec.output.perTask.dirTemplate,
                    result: {
                        format: data.spec.output.perTask.result.format,
                        filename: data.spec.output.perTask.result.filename
                    },
                },
            },

            artifacts: {
                uploadFromWorkDir: data.spec.artifacts.uploadFromWorkDir,
                pathTemplate: data.spec.artifacts.pathTemplate
            },

            security: {
                network: {
                    allowDomains
                },
            },
        },
    }
}