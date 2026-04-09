import {useMemo} from "react"
import {Link} from "react-router-dom"
import {useForm} from "react-hook-form"
import {zodResolver} from "@hookform/resolvers/zod"
import {projectUpsertSchema} from "../../validation/projectSchemas.js"
import {ErrorBanner} from "../ui/ErrorBanner.jsx"
import {InlineLoader} from "../ui/InlineLoader.jsx"
import {PageCard} from "../layout/PageCard.jsx"
import {getApiErrorMessage} from "../../utils/getApiErrorMessage.js"

const getFieldClass = (form, name) => {
    const {errors, touchedFields, dirtyFields} = form.formState

    return errors[name] ? "projectsInput inputInvalid"
        : touchedFields[name] && dirtyFields[name] ? "projectsInput inputValid" : "projectsInput"
}

export const ProjectForm = ({initialValues, onSubmit, isSubmitting = false, submitError,
    submitErrorTitle, submitLabel, submitLoadingLabel, cancelTo, cancelLabel = "Отмена"}) => {

    const resolvedValues = useMemo(
        () => ({
            name: initialValues?.name ?? "",
            description: initialValues?.description ?? ""
        }),
        [initialValues]
    )

    const form = useForm({
        resolver: zodResolver(projectUpsertSchema),
        mode: "onChange",
        defaultValues: resolvedValues,
        values: resolvedValues
    })

    return (
        <PageCard title="Данные проекта">
            {submitError ? (
                <ErrorBanner
                    title={submitErrorTitle}
                    message={getApiErrorMessage(submitError)}
                />
            ) : null}

            <form className="projectsForm" onSubmit={form.handleSubmit(onSubmit)}>
                <div className="projectsFormRow">
                    <label>Название *</label>
                    <input
                        className={getFieldClass(form, "name")}
                        type="text"
                        placeholder="Проект"
                        disabled={isSubmitting}
                        {...form.register("name")}
                    />
                    <p className={form.formState.errors.name ? "instructions instructionsError" : ""}>
                        {form.formState.errors.name?.message}
                    </p>
                </div>

                <div className="projectsFormRow">
                    <label>Описание</label>
                    <textarea
                        className={
                            "projectsTextarea" +
                            (form.formState.errors.description ? " inputInvalid" : "")
                        }
                        placeholder="Коротко опишите проект (опционально)"
                        disabled={isSubmitting}
                        {...form.register("description")}
                    />
                    <p className={form.formState.errors.description ? "instructions instructionsError" : ""}>
                        {form.formState.errors.description?.message}
                    </p>
                </div>

                <div className="projectsActions">
                    <button
                        className="projectsBtn"
                        type="submit"
                        disabled={
                            !form.formState.isValid ||
                            isSubmitting ||
                            form.formState.isSubmitting
                        }>
                        {isSubmitting ? (
                            <InlineLoader label={submitLoadingLabel} />
                        ) : (
                            submitLabel
                        )}
                    </button>

                    <Link className="projectsBtn projectsBtnSecondary" to={cancelTo}>
                        {cancelLabel}
                    </Link>
                </div>
            </form>
        </PageCard>
    )
}