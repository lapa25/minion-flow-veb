import {useMemo} from "react"
import {Link, Navigate, useNavigate, useParams} from "react-router-dom"
import {useSelector} from "react-redux"

import {ErrorBanner} from "../components/ui/ErrorBanner.jsx"
import {InlineLoader} from "../components/ui/InlineLoader.jsx"
import {ConfigForm} from "../components/configs/ConfigForm.jsx"

import {selectCurrentUser} from "../store/auth/authSelectors.js"
import {useGetProjectQuery} from "../store/projects/projectsApiSlice.js"
import {useGetProjectConfigQuery, useUpdateProjectConfigMutation}
    from "../store/configs/configsApiSlice.js"

import {getApiErrorMessage} from "../utils/getApiErrorMessage.js"
import {getProjectRole} from "../utils/projectRole.js"
import {getProjectPermissions} from "../utils/projectPermissions.js"

import {toConfigFormValues, toConfigPayload} from "../validation/configsSchemas.js"

import "./ProjectsPages.css"

export const EditConfigPage = () => {
    const {projectId, configId} = useParams()
    const navigate = useNavigate()
    const currentUser = useSelector(selectCurrentUser)

    const {data: project, isFetching: isProjectFetching, isError: isProjectError, error: projectError,
        refetch: refetchProject} = useGetProjectQuery(projectId, {
        refetchOnMountOrArgChange: true,
    })

    const {data: config, isFetching, isError, error, refetch} = useGetProjectConfigQuery(
        {projectId, configId},
        {
            refetchOnMountOrArgChange: true
        },
    )

    const [updateProjectConfig, {isLoading: isSaving, isError: isSaveError, error: saveError}] =
        useUpdateProjectConfigMutation()

    const projectRole = getProjectRole(project, currentUser)
    const permissions = getProjectPermissions(projectRole)

    const initialValues = useMemo(
        () => toConfigFormValues(config),
        [config]
    )

    if (isProjectFetching || (isFetching && !config)) {
        return (
            <section className="projectsCard">
                <InlineLoader label="Загружаем конфигурацию..." />
            </section>
        )
    }

    if (isProjectError) {
        return (
            <section className="projectsCard">
                <div className="projectsHead">
                    <h2>Редактирование конфигурации</h2>
                    <Link className="line" to={`/projects/${projectId}/configs/${configId}`}>
                        ← К просмотру
                    </Link>
                </div>

                <ErrorBanner
                    title="Не удалось загрузить проект"
                    message={getApiErrorMessage(projectError, "Ошибка загрузки проекта")}
                    onRetry={refetchProject}
                />
            </section>
        )
    }

    if (!permissions.canManageConfigs) {
        return <Navigate to={`/projects/${projectId}/configs/${configId}`} replace />
    }

    if (isError) {
        return (
            <section className="projectsCard">
                <div className="projectsHead">
                    <h2>Редактирование конфигурации</h2>
                    <Link className="line" to={`/projects/${projectId}/configs/${configId}`}>
                        ← К просмотру
                    </Link>
                </div>

                <ErrorBanner
                    title="Не удалось загрузить конфигурацию"
                    message={getApiErrorMessage(error, "Ошибка загрузки конфигурации")}
                    onRetry={refetch}
                />
            </section>
        )
    }

    const onSubmit = async (values) => {
        const payload = toConfigPayload(values)
        const res = await updateProjectConfig({
            projectId,
            configId,
            ...payload
        })

        if ("data" in res) {
            navigate(`/projects/${projectId}/configs/${configId}`)
        }
    }

    return (
        <section className="projectsPage">
            <div className="projectsHeader">
                <div>
                    <h2>Редактирование конфигурации</h2>
                    <p>
                        <Link to={`/projects/${projectId}/configs/${configId}`} className="line">
                            ← К просмотру</Link>
                    </p>
                </div>
                <h2></h2>

                <div className="projectsActions">

                    <button
                        className="projectsBtn projectsBtnSecondary"
                        onClick={() => refetch()}
                        disabled={isFetching}
                        type="button">
                        {isFetching ? <InlineLoader label="Обновляем..." /> : "Обновить"}
                    </button>
                </div>
            </div>

            {isSaveError ? (
                <ErrorBanner
                    title="Не удалось сохранить конфигурацию"
                    message={getApiErrorMessage(saveError, "Ошибка сохранения конфигурации")}
                />
            ) : null}

            <ConfigForm
                mode="edit"
                initialValues={initialValues}
                isSubmitting={isSaving}
                onSubmit={onSubmit}
            />
        </section>
    )
}