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
    const textareaClass = (name) => getFieldClass("projectsTextarea", name)

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
                    <span>Название *</span>
                    <input
                        className={inputClass("name")}
                        disabled={isView || isSubmitting}
                        {...form.register("name")}
                    />
                    <p className={errorMessage("name") ? "instructions instructionsError" : ""}>
                        {errorMessage("name")}
                    </p>
                </label>

                <label className="projectsField">
                    <span>Тип выполнения *</span>
                    <select
                        className="projectsSelect"
                        disabled={isView || isSubmitting}
                        {...form.register("spec.execution.type")}>
                        <option value="stateless">stateless</option>
                        <option value="stateful">stateful</option>
                    </select>
                </label>
            </div>
                <label className="projectsField">
                    <span>Описание</span>
                    <textarea
                        className={textareaClass("description")}
                        disabled={isView || isSubmitting}
                        {...form.register("description")}
                    />
                    <p className={errorMessage("description") ? "instructions instructionsError" : ""}>
                        {errorMessage("description")}
                    </p>
                </label>
            </div>

            <div className="projectsCard">
            <h3>Идентификаторы</h3>

            <div className="projectsTwoCols">
                <label className="projectsField">
                    <span>projectId *</span>
                    <input
                        className={inputClass("spec.projectId")}
                        disabled={isView || isSubmitting}
                        {...form.register("spec.projectId")}
                    />
                    <p className={errorMessage("spec.projectId") ? "instructions instructionsError" : ""}>
                        {errorMessage("spec.projectId")}
                    </p>
                </label>

                <label className="projectsField">
                    <span>userId *</span>
                    <input
                        className={inputClass("spec.userId")}
                        disabled={isView || isSubmitting}
                        {...form.register("spec.userId")}
                    />
                    <p className={errorMessage("spec.userId") ? "instructions instructionsError" : ""}>
                        {errorMessage("spec.userId")}
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
                    <span>bound *</span>
                    <select
                        className="projectsSelect"
                        disabled={isView || isSubmitting}
                        {...form.register("spec.execution.worker.bound")}>
                        <option value="cpu">cpu</option>
                        <option value="io">io</option>
                    </select>
                </label>

                <label className="projectsField">
                    <span>concurrency *</span>
                    <input
                        className={inputClass("spec.execution.worker.concurrency")}
                        disabled={isView || isSubmitting}
                        type="number"
                        min="1"
                        {...form.register("spec.execution.worker.concurrency")}
                    />
                    <p className={errorMessage("spec.execution.worker.concurrency") ? "instructions instructionsError" : ""}>
                        {errorMessage("spec.execution.worker.concurrency")}
                    </p>
                </label>
            </div>

            <div className="projectsTwoCols">
                <label className="projectsField">
                    <span>CPU *</span>
                    <input
                        className={inputClass("spec.execution.worker.resources.cpu")}
                        disabled={isView || isSubmitting}
                        placeholder="500m, 1, 2"
                        {...form.register("spec.execution.worker.resources.cpu")}
                    />
                    <p className={errorMessage("spec.execution.worker.resources.cpu") ? "instructions instructionsError" : ""}>
                        {errorMessage("spec.execution.worker.resources.cpu")}
                    </p>
                </label>

                <label className="projectsField">
                    <span>Memory *</span>
                    <input
                        className={inputClass("spec.execution.worker.resources.memory")}
                        disabled={isView || isSubmitting}
                        placeholder="512Mi, 2Gi"
                        {...form.register("spec.execution.worker.resources.memory")}
                    />
                    <p className={errorMessage("spec.execution.worker.resources.memory") ? "instructions instructionsError" : ""}>
                        {errorMessage("spec.execution.worker.resources.memory")}
                    </p>
                </label>
            </div>
            </div>

            <div className="projectsCard">
            <h3>Timeouts</h3>

            <div className="projectsTwoCols">
                <label className="projectsField">
                    <span>taskSeconds *</span>
                    <input
                        className={inputClass("spec.execution.timeouts.taskSeconds")}
                        disabled={isView || isSubmitting}
                        type="number"
                        min="1"
                        {...form.register("spec.execution.timeouts.taskSeconds")}
                    />
                    <p className={errorMessage("spec.execution.timeouts.taskSeconds") ? "instructions instructionsError" : ""}>
                        {errorMessage("spec.execution.timeouts.taskSeconds")}
                    </p>
                </label>

                <label className="projectsField">
                    <span>runSeconds *</span>
                    <input
                        className={inputClass("spec.execution.timeouts.runSeconds")}
                        disabled={isView || isSubmitting}
                        type="number"
                        min="1"
                        {...form.register("spec.execution.timeouts.runSeconds")}
                    />
                    <p className={errorMessage("spec.execution.timeouts.runSeconds") ? "instructions instructionsError" : ""}>
                        {errorMessage("spec.execution.timeouts.runSeconds")}
                    </p>
                </label>
            </div>
            </div>

            <div className="projectsCard">
            <h3>Retry</h3>

            <div className="projectsTwoCols">
                <label className="projectsField">
                    <span>maxAttempts *</span>
                    <input
                        className={inputClass("spec.execution.retry.maxAttempts")}
                        disabled={isView || isSubmitting}
                        type="number"
                        min="0"
                        {...form.register("spec.execution.retry.maxAttempts")}
                    />
                    <p className={errorMessage("spec.execution.retry.maxAttempts") ? "instructions instructionsError" : ""}>
                        {errorMessage("spec.execution.retry.maxAttempts")}
                    </p>
                </label>

                <label className="projectsField">
                    <span>strategy *</span>
                    <select
                        className="projectsSelect"
                        disabled={isView || isSubmitting}
                        {...form.register("spec.execution.retry.backoff.strategy")}>
                        <option value="fixed">fixed</option>
                        <option value="linear">linear</option>
                        <option value="exponential">exponential</option>
                    </select>
                </label>
            </div>

            <div className="projectsTwoCols">
                <label className="projectsField">
                    <span>baseMs *</span>
                    <input
                        className={inputClass("spec.execution.retry.backoff.baseMs")}
                        disabled={isView || isSubmitting}
                        type="number"
                        min="0"
                        {...form.register("spec.execution.retry.backoff.baseMs")}
                    />
                    <p className={errorMessage("spec.execution.retry.backoff.baseMs") ? "instructions instructionsError" : ""}>
                        {errorMessage("spec.execution.retry.backoff.baseMs")}
                    </p>
                </label>

                <label className="projectsField">
                    <span>maxMs *</span>
                    <input
                        className={inputClass("spec.execution.retry.backoff.maxMs")}
                        disabled={isView || isSubmitting}
                        type="number"
                        min="0"
                        {...form.register("spec.execution.retry.backoff.maxMs")}
                    />
                    <p className={errorMessage("spec.execution.retry.backoff.maxMs") ? "instructions instructionsError" : ""}>
                        {errorMessage("spec.execution.retry.backoff.maxMs")}
                    </p>
                </label>
            </div>

            <label className="projectsPills" >
                <input
                    disabled={isView || isSubmitting}
                    type="checkbox"
                    {...form.register("spec.execution.retry.backoff.jitter")}
                />
                <span>Включить jitter</span>
            </label>
            </div>


            <div className="projectsCard">
            <h3>Limits</h3>

            <div className="projectsTwoCols">
                <label className="projectsField">
                    <span>maxErrorRatePct</span>
                    <input
                        className={inputClass("spec.execution.limits.maxErrorRatePct")}
                        disabled={isView || isSubmitting}
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        {...form.register("spec.execution.limits.maxErrorRatePct")}
                    />
                    <p className={errorMessage("spec.execution.limits.maxErrorRatePct") ? "instructions instructionsError" : ""}>
                        {errorMessage("spec.execution.limits.maxErrorRatePct")}
                    </p>
                </label>

                <label className="projectsField">
                    <span>maxBudgetRub</span>
                    <input
                        className={inputClass("spec.execution.limits.maxBudgetRub")}
                        disabled={isView || isSubmitting}
                        type="number"
                        min="0"
                        step="0.01"
                        {...form.register("spec.execution.limits.maxBudgetRub")}
                    />
                    <p className={errorMessage("spec.execution.limits.maxBudgetRub") ? "instructions instructionsError" : ""}>
                        {errorMessage("spec.execution.limits.maxBudgetRub")}
                    </p>
                </label>
            </div>

            <label className="projectsField">
                <span>deadlineAt</span>
                <input
                    className={inputClass("spec.execution.limits.deadlineAt")}
                    disabled={isView || isSubmitting}
                    placeholder="2026-04-01T10:00:00Z"
                    {...form.register("spec.execution.limits.deadlineAt")}
                />
                <p className={errorMessage("spec.execution.limits.deadlineAt") ? "instructions instructionsError" : ""}>
                    {errorMessage("spec.execution.limits.deadlineAt")}
                </p>
            </label>
            </div>

            <div className="projectsCard">
            <h3>Input</h3>

            <div className="projectsTwoCols">
                <label className="projectsField">
                    <span>input.type *</span>
                    <input
                        className={inputClass("spec.input.type")}
                        disabled={isView || isSubmitting}
                        {...form.register("spec.input.type")}
                    />
                    <p className={errorMessage("spec.input.type") ? "instructions instructionsError" : ""}>
                        {errorMessage("spec.input.type")}
                    </p>
                </label>

                <label className="projectsField">
                    <span>bucket *</span>
                    <input
                        className={inputClass("spec.input.source.bucket")}
                        disabled={isView || isSubmitting}
                        {...form.register("spec.input.source.bucket")}
                    />
                    <p className={errorMessage("spec.input.source.bucket") ? "instructions instructionsError" : ""}>
                        {errorMessage("spec.input.source.bucket")}
                    </p>
                </label>
            </div>

            <label className="projectsField">
                <span>key *</span>
                <input
                    className={inputClass("spec.input.source.key")}
                    disabled={isView || isSubmitting}
                    {...form.register("spec.input.source.key")}
                />
                <p className={errorMessage("spec.input.source.key") ? "instructions instructionsError" : ""}>
                    {errorMessage("spec.input.source.key")}
                </p>
            </label>
            </div>


            <div className="projectsCard">
            <h3>Output</h3>

            <div className="projectsTwoCols">
                <label className="projectsField">
                    <span>destination.type *</span>
                    <input
                        className={inputClass("spec.output.destination.type")}
                        disabled={isView || isSubmitting}
                        {...form.register("spec.output.destination.type")}
                    />
                    <p className={errorMessage("spec.output.destination.type") ? "instructions instructionsError" : ""}>
                        {errorMessage("spec.output.destination.type")}
                    </p>
                </label>

                <label className="projectsField">
                    <span>destination.bucket *</span>
                    <input
                        className={inputClass("spec.output.destination.bucket")}
                        disabled={isView || isSubmitting}
                        {...form.register("spec.output.destination.bucket")}
                    />
                    <p className={errorMessage("spec.output.destination.bucket") ? "instructions instructionsError" : ""}>
                        {errorMessage("spec.output.destination.bucket")}
                    </p>
                </label>
            </div>

            <label className="projectsField">
                <span>destination.prefix *</span>
                <input
                    className={inputClass("spec.output.destination.prefix")}
                    disabled={isView || isSubmitting}
                    {...form.register("spec.output.destination.prefix")}
                />
                <p className={errorMessage("spec.output.destination.prefix") ? "instructions instructionsError" : ""}>
                    {errorMessage("spec.output.destination.prefix")}
                </p>
            </label>

            <div className="projectsTwoCols">
                <label className="projectsField">
                    <span>dirTemplate *</span>
                    <input
                        className={inputClass("spec.output.perTask.dirTemplate")}
                        disabled={isView || isSubmitting}
                        {...form.register("spec.output.perTask.dirTemplate")}
                    />
                    <p className={errorMessage("spec.output.perTask.dirTemplate") ? "instructions instructionsError" : ""}>
                        {errorMessage("spec.output.perTask.dirTemplate")}
                    </p>
                </label>

                <label className="projectsField">
                    <span>result.format *</span>
                    <input
                        className={inputClass("spec.output.perTask.result.format")}
                        disabled={isView || isSubmitting}
                        {...form.register("spec.output.perTask.result.format")}
                    />
                    <p className={errorMessage("spec.output.perTask.result.format") ? "instructions instructionsError" : ""}>
                        {errorMessage("spec.output.perTask.result.format")}
                    </p>
                </label>
            </div>

            <label className="projectsField">
                <span>result.filename *</span>
                <input
                    className={inputClass("spec.output.perTask.result.filename")}
                    disabled={isView || isSubmitting}
                    {...form.register("spec.output.perTask.result.filename")}
                />
                <p className={errorMessage("spec.output.perTask.result.filename") ? "instructions instructionsError" : ""}>
                    {errorMessage("spec.output.perTask.result.filename")}
                </p>
            </label>
            </div>

            <div className="projectsCard">
            <h3>Artifacts</h3>

            <div className="projectsTwoCols">
                <label className="projectsField">
                    <span>uploadFromWorkDir *</span>
                    <input
                        className={inputClass("spec.artifacts.uploadFromWorkDir")}
                        disabled={isView || isSubmitting}
                        {...form.register("spec.artifacts.uploadFromWorkDir")}
                    />
                    <p className={errorMessage("spec.artifacts.uploadFromWorkDir") ? "instructions instructionsError" : ""}>
                        {errorMessage("spec.artifacts.uploadFromWorkDir")}
                    </p>
                </label>

                <label className="projectsField">
                    <span>pathTemplate *</span>
                    <input
                        className={inputClass("spec.artifacts.pathTemplate")}
                        disabled={isView || isSubmitting}
                        {...form.register("spec.artifacts.pathTemplate")}
                    />
                    <p className={errorMessage("spec.artifacts.pathTemplate") ? "instructions instructionsError" : ""}>
                        {errorMessage("spec.artifacts.pathTemplate")}
                    </p>
                </label>
            </div>
            </div>

            <div className="projectsCard">
            <h3>Security</h3>

            <label className="projectsField">
                <span>allowDomainsText</span>
                <textarea
                    className={textareaClass("spec.security.network.allowDomainsText")}
                    disabled={isView || isSubmitting}
                    placeholder={"yandex.ru\ngoogle.com"}
                    {...form.register("spec.security.network.allowDomainsText")}
                />
                <p className={errorMessage("spec.security.network.allowDomainsText") ? "instructions instructionsError" : ""}>
                    {errorMessage("spec.security.network.allowDomainsText")}
                </p>
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