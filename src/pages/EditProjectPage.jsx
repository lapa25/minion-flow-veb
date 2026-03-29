import {useMemo} from "react"
import {Link, useNavigate, useParams} from "react-router-dom"
import {useSelector} from "react-redux"
import {useForm} from "react-hook-form"
import {zodResolver} from "@hookform/resolvers/zod"

import {selectCurrentUser} from "../store/auth/authSelectors.js"
import {useGetProjectQuery, useUpdateProjectMutation} from "../store/projects/projectsApiSlice.js"
import {projectUpsertSchema} from "../validation/projectSchemas.js"

import {ErrorBanner} from "../components/ui/ErrorBanner.jsx"
import {InlineLoader} from "../components/ui/InlineLoader.jsx"
import {getApiErrorMessage} from "../utils/getApiErrorMessage.js"

import "./ProjectsPages.css"
import {getProjectRole} from "../utils/projectRole.js";
import {getProjectPermissions} from "../utils/projectPermissions.js";

export const EditProjectPage = () => {
    const { projectId } = useParams()
    const navigate = useNavigate()
    const currentUser = useSelector(selectCurrentUser)

    const {data: project, isFetching, isError, error, refetch} = useGetProjectQuery(projectId,
        { refetchOnMountOrArgChange: true })

    const defaults = useMemo(
        () => ({
            name: project?.name ?? "",
            description: project?.description ?? "",
            is_active: Boolean(project?.is_active ?? true),
        }),
        [project]
    );

    const [updateProject, { isLoading: isSaving, isError: isSaveError, error: saveError }] =
        useUpdateProjectMutation()

    const projectRole = getProjectRole(project, currentUser)
    const permissions = getProjectPermissions(projectRole)

    const form = useForm({
        resolver: zodResolver(projectUpsertSchema),
        mode: "onChange",
        defaultValues: defaults,
        values: defaults,
    })

    const fieldClass = (name) => {
        const { errors, touchedFields, dirtyFields } = form.formState
        return errors[name]
            ? "projectsInput inputInvalid" : touchedFields[name] && dirtyFields[name]
                ? "projectsInput inputValid" : "projectsInput"
    }

    const onSubmit = async (values) => {
        if (!permissions.canManageMembers) {
            return
        }
        const payload = {
            projectId,
            name: values.name.trim(),
            description: values.description?.trim() ? values.description.trim() : null,
            is_active: Boolean(values.is_active),
        }
        const res = await updateProject(payload)
        if ("data" in res) {
            navigate(`/projects/${projectId}`)
        }
    }

    return (
        <section className="projectsPage">
            <div className="projectsHeader">
                <div>
                    <h2>Редактирование проекта</h2>
                    <p>
                        <Link to={`/projects/${projectId}`} className="line">← Назад к проекту</Link>
                    </p>
                </div>
                <div className="projectsActions">
                    <button className="projectsBtn projectsBtnSecondary" onClick={() => refetch()} disabled={isFetching}>
                        {isFetching ? <InlineLoader label="Обновляем..." /> : "Обновить"}
                    </button>
                </div>
            </div>

            {!permissions.canManageProject ? (
                <ErrorBanner
                    title="Недостаточно прав"
                    message="Действие недоступно: изменять данные о проекте может только владелец"
                />
            ) : null}

            {isError ? (
                <ErrorBanner
                    title="Не удалось загрузить проект"
                    message={getApiErrorMessage(error)}
                    onRetry={() => refetch()}
                />
            ) : null}

            {isSaveError ? (
                <ErrorBanner
                    title="Не удалось сохранить"
                    message={getApiErrorMessage(saveError)}
                />
            ) : null}

            <div className="projectsCard">
                <h3>Данные проекта</h3>

                <form className="projectsForm" onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="projectsFormRow">
                        <label>Название *</label>
                        <input
                            className={fieldClass("name")}
                            type="text"
                            disabled={!permissions.canManageProject || isSaving}
                            {...form.register("name")}
                        />
                        <p className={form.formState.errors.name ? "instructions instructionsError" : ""}>
                            {form.formState.errors.name?.message}
                        </p>
                    </div>

                    <div className="projectsFormRow">
                        <label>Описание</label>
                        <textarea
                            className={"projectsTextarea" + (form.formState.errors.description ? " inputInvalid" : "")}
                            disabled={!permissions.canManageProject || isSaving}
                            {...form.register("description")}
                        />
                        <p className={form.formState.errors.description ? "instructions instructionsError" : ""}>
                            {form.formState.errors.description?.message}
                        </p>
                    </div>

                    <label className="projectsPills" style={{ alignItems: "center" }}>
                        <input
                            type="checkbox"
                            disabled={!permissions.canManageProject || isSaving}
                            {...form.register("is_active")}
                        />
                        <span>Проект активен</span>
                    </label>

                    <div className="projectsActions">
                        <button
                            className="projectsBtn"
                            type="submit"
                            disabled={!permissions.canManageProject || !form.formState.isValid || isSaving || form.formState.isSubmitting}>
                            {isSaving ? <InlineLoader label="Сохраняем..." /> : "Сохранить"}
                        </button>
                        <Link
                            className="projectsBtn projectsBtnSecondary" to={`/projects/${projectId}`}>
                            Отмена
                        </Link>
                    </div>
                </form>
            </div>
        </section>
    );
};