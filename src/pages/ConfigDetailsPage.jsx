import {useMemo, useState} from "react"
import {Link, useNavigate, useParams} from "react-router-dom"
import {ErrorBanner} from "../components/ui/ErrorBanner.jsx"
import {InlineLoader} from "../components/ui/InlineLoader.jsx"
import {ConfigForm} from "../components/configs/ConfigForm.jsx"
import {useGetProjectQuery} from "../store/projects/projectsApiSlice.js"
import {useDeleteProjectConfigMutation, useGetProjectConfigQuery}
    from "../store/configs/configsApiSlice.js"
import {getApiErrorMessage} from "../utils/getApiErrorMessage.js"
import {formatDateTime} from "../utils/datetime.js"
import {PROJECT_ROLE} from "../utils/projectRole.js"
import {toConfigFormValues} from "../validation/configsSchemas.js"
import "../styles/ProjectsPages.css"
import {PageCard} from "../components/layout/PageCard.jsx";
import {QueryBoundary} from "../components/guards/QueryBoundary.jsx";
import {ProjectPermissionsBoundary} from "../components/guards/ProjectPermissionsBoundary.jsx";
import {PageHeader} from "../components/layout/PageHeader.jsx";
import {LaunchTaskDialog} from "../components/tasks/LaunchTaskDialog.jsx";


export const ConfigDetailsPage = () => {
    const {projectId, configId} = useParams()
    const navigate = useNavigate()

    const [isLaunchOpen, setIsLaunchOpen] = useState(false)

    const {data: project, isFetching: isProjectFetching, isError: isProjectError,
        error: projectError, refetch: refetchProject} = useGetProjectQuery(projectId, {
        refetchOnMountOrArgChange: true,
    })

    const {data: config, isFetching, isError, error, refetch} = useGetProjectConfigQuery(
        {projectId, configId},
        {
            refetchOnMountOrArgChange: true,
        },
    )

    const [deleteProjectConfig, {isLoading: isDeleting, isError: isDeleteError, error: deleteError}] =
        useDeleteProjectConfigMutation()

    const initialValues = useMemo(() => toConfigFormValues(config), [config])

    const onDelete = async (permissions) => {
        if (!permissions?.canManageConfigs) {
            return
        }
        if (!window.confirm("Удалить конфигурацию? Действие необратимо")) {
            return
        }
        await deleteProjectConfig({ projectId, configId }).unwrap()
        navigate(`/projects/${projectId}/configs`)
    }

    return (
        <QueryBoundary
            isLoading={isProjectFetching}
            hasData={!!project}
            isError={isProjectError}
            error={projectError}
            onRetry={refetchProject}
            loadingLabel="Загружаем проект..."
            errorTitle="Не удалось загрузить проект"
            errorMessage={getApiErrorMessage(projectError, "Ошибка загрузки проекта")}
        >
            <ProjectPermissionsBoundary
                projectId={projectId}
                permission="canViewConfigs"
                deniedMessage="У вас нет доступа к просмотру конфигураций"
            >
                {({permissions, projectRole}) => (
                    <QueryBoundary
                        isLoading={isFetching}
                        hasData={!!config}
                        isError={isError}
                        error={error}
                        onRetry={refetch}
                        loadingLabel="Загружаем конфигурацию..."
                        errorTitle="Не удалось загрузить конфигурацию"
                        errorMessage={getApiErrorMessage(error, "Ошибка загрузки конфигурации")}
                    >
                        <section className="projectsPage">
                            <PageHeader
                                title={config?.alias ?? "Конфигурация"}
                                backTo={`/projects/${projectId}/configs`}
                                backLabel="К списку"
                                actions={
                                    <>
                                        {permissions?.canManageConfigs ? (
                                            <Link
                                                className="projectsBtn"
                                                to={`/projects/${projectId}/configs/${configId}/edit`}
                                            >
                                                Редактировать
                                            </Link>
                                        ) : null}

                                        {permissions?.canManageTasks ? (
                                            <button
                                                className="projectsBtn"
                                                type="button"
                                                onClick={() => setIsLaunchOpen((prev) => !prev)}
                                            >
                                                {isLaunchOpen ? "Скрыть форму" : "Запустить с этой конфигурацией"}
                                            </button>
                                        ) : null}

                                        {permissions?.canManageConfigs ? (
                                            <button
                                                className="projectsBtn"
                                                disabled={isDeleting}
                                                onClick={() => onDelete(permissions)}
                                                type="button"
                                            >
                                                {isDeleting ? <InlineLoader label="Удаляем..." /> : "Удалить"}
                                            </button>
                                        ) : null}
                                    </>
                                }
                            />
                            {isDeleteError ? (
                                <ErrorBanner
                                    title="Не удалось удалить конфигурацию"
                                    message={getApiErrorMessage(deleteError, "Ошибка удаления конфигурации")}
                                />
                            ) : null}
                            {permissions?.canManageTasks ? (
                                <LaunchTaskDialog
                                    isOpen={isLaunchOpen}
                                    projectId={projectId}
                                    configId={config?.configId}
                                    configAlias={config?.alias}
                                    lockConfig
                                    onClose={() => setIsLaunchOpen(false)}
                                />
                            ) : null}
                            <PageCard title="Основное">
                                <div className="projectsPills">
                                    <span className="pill">Моя роль: {PROJECT_ROLE[projectRole]}</span>
                                    <span className="pill">Config ID: {config?.configId ?? "—"}</span>
                                    <span className="pill">Owner ID: {config?.ownerId ?? "—"}</span>
                                    <span className="pill">Project ID: {config?.projectId ?? projectId}</span>
                                    <span className="pill">
                                        Создано: {config?.createdAt ? formatDateTime(config.createdAt) : "—"}
                                    </span>
                                </div>
                            </PageCard>
                            <PageCard title="Параметры конфигурации">
                                <ConfigForm mode="view" initialValues={initialValues} />
                            </PageCard>
                        </section>
                    </QueryBoundary>
                )}
            </ProjectPermissionsBoundary>
        </QueryBoundary>
    )
}