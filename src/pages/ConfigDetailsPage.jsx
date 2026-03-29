import {useMemo} from "react"
import {Link, useNavigate, useParams} from "react-router-dom"
import {useSelector} from "react-redux"

import {ErrorBanner} from "../components/ui/ErrorBanner.jsx"
import {InlineLoader} from "../components/ui/InlineLoader.jsx"
import {ConfigForm} from "../components/configs/ConfigForm.jsx"

import {selectCurrentUser} from "../store/auth/authSelectors.js"
import {useGetProjectQuery} from "../store/projects/projectsApiSlice.js"
import {useDeleteProjectConfigMutation, useExportProjectConfigMutation, useGetProjectConfigQuery}
    from "../store/configs/configsApiSlice.js"

import {getApiErrorMessage} from "../utils/getApiErrorMessage.js"
import {formatDateTime} from "../utils/datetime.js"
import {getProjectRole, PROJECT_ROLE} from "../utils/projectRole.js"
import {getProjectPermissions} from "../utils/projectPermissions.js"
import {toConfigFormValues} from "../validation/configsSchemas.js"

import "./ProjectsPages.css"

export const ConfigDetailsPage = () => {
    const {projectId, configId} = useParams()
    const navigate = useNavigate()
    const currentUser = useSelector(selectCurrentUser)

    const {data: project, isFetching: isProjectFetching, isError: isProjectError,
        error: projectError, refetch: refetchProject} = useGetProjectQuery(projectId, {
        refetchOnMountOrArgChange: true,
    })

    const projectRole = getProjectRole(project, currentUser)
    const permissions = getProjectPermissions(projectRole)

    const {data: config, isFetching, isError, error, refetch} = useGetProjectConfigQuery(
        {projectId, configId},
        {
            refetchOnMountOrArgChange: true,
            skip: !permissions.canViewConfigs
        },
    )

    const [deleteProjectConfig, {isLoading: isDeleting, isError: isDeleteError, error: deleteError}] =
        useDeleteProjectConfigMutation()

    const [downloadProjectConfig, {isLoading: isDownloading, isError: isDownloadError, error: downloadError}] =
        useExportProjectConfigMutation()

    const initialValues = useMemo(() => toConfigFormValues(config), [config])

    if (isProjectFetching && !project) {
        return (
            <section className="projectsCard">
                <InlineLoader label="Загружаем проект..." />
            </section>
        )
    }

    if (isProjectError) {
        return (
            <section className="projectsCard">
                <ErrorBanner
                    title="Не удалось загрузить проект"
                    message={getApiErrorMessage(projectError, "Ошибка загрузки проекта")}
                    onRetry={refetchProject}
                />
            </section>
        )
    }

    if (!permissions.canViewConfigs) {
        return (
            <section className="projectsCard">
                <ErrorBanner
                    title="Недостаточно прав"
                    message="У вас нет доступа к просмотру конфигураций"
                />
            </section>
        )
    }

    if (isFetching && !config) {
        return (
            <section className="projectsCard">
                <InlineLoader label="Загружаем конфигурацию..." />
            </section>
        )
    }

    if (isError) {
        return (
            <section className="projectsCard">
                <ErrorBanner
                    title="Не удалось загрузить конфигурацию"
                    message={getApiErrorMessage(error, "Ошибка загрузки конфигурации")}
                    onRetry={refetch}
                />
            </section>
        )
    }

    const onDelete = async () => {
        if (!permissions.canManageConfigs) {
            return
        }

        if (!window.confirm("Удалить конфигурацию? Действие необратимо")) {
            return
        }

        const res = await deleteProjectConfig({projectId, configId})

        if ("data" in res) {
            navigate(`/projects/${projectId}/configs`)
        }
    }

    const onDownload = async () => {
        if (!permissions.canExportConfigs) {
            return
        }

        const blob = await downloadProjectConfig({
            projectId,
            configId
        }).unwrap()

        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${config?.name ?? "config"}.json`
        a.click()
        window.URL.revokeObjectURL(url)
    }

    return (
        <section className="projectsPage">
            <div className="projectsHeader">
                <div>
                    <h2>{config?.name ?? "Конфигурация"}</h2>
                    <p>
                        <Link to={`/projects/${projectId}/configs`} className="line">← К списку</Link>
                    </p>
                </div>
                <div className="projectsActions">
                    {permissions.canManageConfigs ? (
                        <Link className="projectsBtn" to={`/projects/${projectId}/configs/${configId}/edit`}>
                            Редактировать
                        </Link>
                    ) : null}

                    {permissions.canExportConfigs ? (
                        <button
                            className="projectsBtn"
                            disabled={isDownloading}
                            onClick={onDownload}
                            type="button">
                            {isDownloading ? <InlineLoader label="Скачиваем..." /> : "Скачать"}
                        </button>
                    ) : null}

                    {permissions.canManageRuns ? (
                        <button
                            className="projectsBtn"
                            type="button">
                            Запустить
                        </button>
                    ) : null}

                    {permissions.canManageConfigs ? (
                        <button
                            className="projectsBtn"
                            disabled={isDeleting}
                            onClick={onDelete}
                            type="button">
                            {isDeleting ? <InlineLoader label="Удаляем..." /> : "Удалить"}
                        </button>
                    ) : null}
                </div>
            </div>
            <section>
                {isDeleteError ? (
                    <ErrorBanner
                        title="Не удалось удалить конфигурацию"
                        message={getApiErrorMessage(deleteError, "Ошибка удаления конфигурации")}
                    />
                ) : null}

                {isDownloadError ? (
                    <ErrorBanner
                        title="Не удалось скачать конфигурацию"
                        message={getApiErrorMessage(downloadError, "Ошибка скачивания конфигурации")}
                    />
                ) : null}
                <div className="projectsCard">
                    <h3>Основное</h3>
                    <div className="projectsPills">
                        <span className="pill">Моя роль: {PROJECT_ROLE[projectRole]}</span>
                        <span className="pill">Обновлено:
                            {formatDateTime(config?.updated_at ?? config?.created_at)}</span>
                    </div>
                    <p className="projectsHint">
                        {config?.description ? config.description : "Описание не задано"}
                    </p>
                </div>

                <div className="projectsCard">
                    <h3>Параметры конфигурации</h3>
                    <ConfigForm mode="view" initialValues={initialValues} />
                </div>
            </section>
        </section>
    )
}