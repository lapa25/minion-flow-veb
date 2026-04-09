import {useEffect, useMemo} from "react"
import {useForm} from "react-hook-form"
import {zodResolver} from "@hookform/resolvers/zod"

import {InlineLoader} from "../ui/InlineLoader.jsx"
import {configFormDefaultValues, configFormSchema, toConfigPayload} from "../../validation/configsSchemas.js"

export const ConfigForm = ({mode = "create", initialValues = configFormDefaultValues,
                               isSubmitting = false, onSubmit}) => {
    const isView = mode === "view"
    const isEdit = mode === "edit"

    const form = useForm({
        resolver: zodResolver(configFormSchema),
        mode: "onChange",
        defaultValues: configFormDefaultValues
    })

    useEffect(() => {
        if (initialValues) {
            form.reset(initialValues)
        }
    }, [form, initialValues])

    const values = form.watch()
    const schedulingMode = form.watch("spec.execution.scheduling.mode")

    const getFieldClass = (baseClass, name) => {
        const { error, isTouched, isDirty } = form.getFieldState(name, form.formState)

        if (error) {
            return `${baseClass} inputInvalid`
        }
        if (isTouched && isDirty) {
            return `${baseClass} inputValid`
        }
        return baseClass
    }

    const inputClass = (name) => getFieldClass("projectsInput", name)

    const errorMessage = (name) => form.getFieldState(name, form.formState).error?.message

    const previewJson = useMemo(() => {
        try {
            return JSON.stringify(toConfigPayload(values), null, 2)
        } catch {
            return JSON.stringify(values ?? {}, null, 2)
        }
    }, [values])

    const handleSubmit = async (formValues) => {
        if (isView || typeof onSubmit !== "function") {
            return
        }
        await onSubmit(formValues)
    }

    return (
        <form className="projectsForm" onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="projectsCard">
                <h3>Основное</h3>

                <div className="projectsTwoCols">
                    <label className="projectsField">
                        <span>Alias *</span>
                        <input
                            className={inputClass("alias")}
                            disabled={isView || isSubmitting}
                            {...form.register("alias")}
                        />
                        <p className={errorMessage("alias") ? "instructions instructionsError" : ""}>
                            {errorMessage("alias")}
                        </p>
                    </label>

                    <label className="projectsField">
                        <span>Тип выполнения</span>
                        <select
                            className="projectsSelect"
                            disabled={isView || isSubmitting}
                            {...form.register("config.type")}>
                            <option value="stateless">stateless</option>
                            <option value="stateful">stateful</option>
                        </select>
                        <p
                            className={
                                errorMessage("config.type") ? "instructions instructionsError" : ""
                            }>
                            {errorMessage("config.type")}
                        </p>
                    </label>
                </div>
            </div>

            <div className="projectsCard">
                <h3>Scheduling</h3>
                <div className="projectsTwoCols">
                    <label className="projectsField">
                        <span>Режим *</span>
                        <select
                            className="projectsSelect"
                            disabled={isView || isSubmitting}
                            {...form.register("spec.execution.scheduling.mode")}>
                            <option value="asp">asp</option>
                            <option value="fixed">fixed</option>
                        </select>
                    </label>

                    {schedulingMode === "fixed" ? (
                        <label className="projectsField">
                            <span>parallelism *</span>
                            <input
                                className={inputClass("spec.execution.scheduling.parallelism")}
                                disabled={isView || isSubmitting}
                                type="number"
                                min="1"
                                {...form.register("spec.execution.scheduling.parallelism")}
                            />
                            <p className={errorMessage("spec.execution.scheduling.parallelism") ? "instructions instructionsError" : ""}>
                                {errorMessage("spec.execution.scheduling.parallelism")}
                            </p>
                        </label>
                    ) : (
                        <div className="projectsTwoCols">
                            <label className="projectsField">
                                <span>minParallelism *</span>
                                <input
                                    className={inputClass("spec.execution.scheduling.minParallelism")}
                                    disabled={isView || isSubmitting}
                                    type="number"
                                    min="1"
                                    {...form.register("spec.execution.scheduling.minParallelism")}
                                />
                                <p className={errorMessage("spec.execution.scheduling.minParallelism") ? "instructions instructionsError" : ""}>
                                    {errorMessage("spec.execution.scheduling.minParallelism")}
                                </p>
                            </label>

                            <label className="projectsField">
                                <span>maxParallelism *</span>
                                <input
                                    className={inputClass("spec.execution.scheduling.maxParallelism")}
                                    disabled={isView || isSubmitting}
                                    type="number"
                                    min="1"
                                    {...form.register("spec.execution.scheduling.maxParallelism")}
                                />
                                <p className={errorMessage("spec.execution.scheduling.maxParallelism") ? "instructions instructionsError" : ""}>
                                    {errorMessage("spec.execution.scheduling.maxParallelism")}
                                </p>
                            </label>
                        </div>
                    )}
                </div>
            </div>

            <div className="projectsCard">
                <h3>Worker</h3>

                <div className="projectsTwoCols">
                    <label className="projectsField">
                        <span>bound</span>
                        <select
                            className="projectsSelect"
                            disabled={isView || isSubmitting}
                            {...form.register("config.worker.bound")}>
                            <option value="cpu">cpu</option>
                            <option value="io">io</option>
                        </select>
                        <p
                            className={
                                errorMessage("config.worker.bound")
                                    ? "instructions instructionsError"
                                    : ""
                            }
                        >
                            {errorMessage("config.worker.bound")}
                        </p>
                    </label>

                    <label className="projectsField">
                        <span>concurrency</span>
                        <input
                            className={inputClass("config.worker.concurrency")}
                            disabled={isView || isSubmitting}
                            type="number"
                            min="0"
                            {...form.register("config.worker.concurrency")}
                        />
                        <p
                            className={
                                errorMessage("config.worker.concurrency")
                                    ? "instructions instructionsError"
                                    : ""
                            }
                        >
                            {errorMessage("config.worker.concurrency")}
                        </p>
                    </label>
                </div>

                <div className="projectsTwoCols">
                    <label className="projectsField">
                        <span>CPU</span>
                        <input
                            className={inputClass("config.worker.resources.cpu")}
                            disabled={isView || isSubmitting}
                            placeholder="500m, 1, 2"
                            {...form.register("config.worker.resources.cpu")}
                        />
                        <p
                            className={
                                errorMessage("config.worker.resources.cpu")
                                    ? "instructions instructionsError"
                                    : ""
                            }
                        >
                            {errorMessage("config.worker.resources.cpu")}
                        </p>
                    </label>

                    <label className="projectsField">
                        <span>Memory</span>
                        <input
                            className={inputClass("config.worker.resources.memory")}
                            disabled={isView || isSubmitting}
                            placeholder="512Mi, 2Gi"
                            {...form.register("config.worker.resources.memory")}
                        />
                        <p
                            className={
                                errorMessage("config.worker.resources.memory")
                                    ? "instructions instructionsError"
                                    : ""
                            }
                        >
                            {errorMessage("config.worker.resources.memory")}
                        </p>
                    </label>
                </div>
            </div>

            <div className="projectsCard">
                <h3>Timeouts</h3>

                <div className="projectsTwoCols">
                    <label className="projectsField">
                        <span>microtaskSeconds</span>
                        <input
                            className={inputClass("config.timeouts.microtaskSeconds")}
                            disabled={isView || isSubmitting}
                            type="number"
                            min="0"
                            {...form.register("config.timeouts.microtaskSeconds")}
                        />
                        <p
                            className={
                                errorMessage("config.timeouts.microtaskSeconds")
                                    ? "instructions instructionsError"
                                    : ""
                            }
                        >
                            {errorMessage("config.timeouts.microtaskSeconds")}
                        </p>
                    </label>

                    <label className="projectsField">
                        <span>taskSeconds</span>
                        <input
                            className={inputClass("config.timeouts.taskSeconds")}
                            disabled={isView || isSubmitting}
                            type="number"
                            min="0"
                            {...form.register("config.timeouts.taskSeconds")}
                        />
                        <p
                            className={
                                errorMessage("config.timeouts.taskSeconds")
                                    ? "instructions instructionsError"
                                    : ""
                            }
                        >
                            {errorMessage("config.timeouts.taskSeconds")}
                        </p>
                    </label>
                </div>
            </div>

            <div className="projectsCard">
                <h3>Retry</h3>

                <div className="projectsTwoCols">
                    <label className="projectsField">
                        <span>maxAttempts</span>
                        <input
                            className={inputClass("config.retry.maxAttempts")}
                            disabled={isView || isSubmitting}
                            type="number"
                            min="0"
                            {...form.register("config.retry.maxAttempts")}
                        />
                        <p
                            className={
                                errorMessage("config.retry.maxAttempts")
                                    ? "instructions instructionsError"
                                    : ""
                            }
                        >
                            {errorMessage("config.retry.maxAttempts")}
                        </p>
                    </label>

                    <label className="projectsField">
                        <span>strategy</span>
                        <input
                            className={inputClass("config.retry.backoff.strategy")}
                            disabled={isView || isSubmitting}
                            placeholder="fixed / exponential / custom"
                            {...form.register("config.retry.backoff.strategy")}
                        />
                        <p
                            className={
                                errorMessage("config.retry.backoff.strategy")
                                    ? "instructions instructionsError"
                                    : ""
                            }
                        >
                            {errorMessage("config.retry.backoff.strategy")}
                        </p>
                    </label>
                </div>

                <div className="projectsTwoCols">
                    <label className="projectsField">
                        <span>baseMs</span>
                        <input
                            className={inputClass("config.retry.backoff.baseMs")}
                            disabled={isView || isSubmitting}
                            type="number"
                            min="0"
                            {...form.register("config.retry.backoff.baseMs")}
                        />
                        <p
                            className={
                                errorMessage("config.retry.backoff.baseMs")
                                    ? "instructions instructionsError"
                                    : ""
                            }
                        >
                            {errorMessage("config.retry.backoff.baseMs")}
                        </p>
                    </label>

                    <label className="projectsField">
                        <span>maxMs</span>
                        <input
                            className={inputClass("config.retry.backoff.maxMs")}
                            disabled={isView || isSubmitting}
                            type="number"
                            min="0"
                            {...form.register("config.retry.backoff.maxMs")}
                        />
                        <p
                            className={
                                errorMessage("config.retry.backoff.maxMs")
                                    ? "instructions instructionsError"
                                    : ""
                            }
                        >
                            {errorMessage("config.retry.backoff.maxMs")}
                        </p>
                    </label>
                </div>

                <label className="projectsPills">
                    <input
                        disabled={isView || isSubmitting}
                        type="checkbox"
                        {...form.register("config.retry.backoff.jitter")}
                    />
                    <span>Включить jitter</span>
                </label>
            </div>

            <div className="projectsCard">
                <h3>Preview JSON</h3>
                <textarea className="projectsTextarea" readOnly value={previewJson} />
            </div>

            {!isView ? (
                <div className="projectsActions">
                    <button
                        className="projectsBtn"
                        type="submit"
                        disabled={!form.formState.isValid || isSubmitting || form.formState.isSubmitting}>
                        {isSubmitting ? (
                            <InlineLoader label={isEdit ? "Сохраняем..." : "Создаём..."} />
                        ) : isEdit ? (
                            "Сохранить"
                        ) : (
                            "Создать"
                        )}
                    </button>
                </div>
            ) : null}
        </form>
    )
}