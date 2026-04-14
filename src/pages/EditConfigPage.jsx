import {useMemo} from "react"
import {useNavigate, useParams} from "react-router-dom"
import {ErrorBanner} from "../components/ui/ErrorBanner.jsx"
import {ConfigForm} from "../components/configs/ConfigForm.jsx"
import {useGetProjectQuery} from "../store/projects/projectsApiSlice.js"
import {useGetProjectConfigQuery, useUpdateProjectConfigMutation}
    from "../store/configs/configsApiSlice.js"
import {getApiErrorMessage} from "../utils/getApiErrorMessage.js"
import {toConfigFormValues, toConfigPayload} from "../validation/configsSchemas.js"
import "../styles/ProjectsPages.css"
import {QueryBoundary} from "../components/guards/QueryBoundary.jsx";
import {ProjectPermissionsBoundary} from "../components/guards/ProjectPermissionsBoundary.jsx";
import {PageHeader} from "../components/layout/PageHeader.jsx";
import {RefreshButton} from "../components/ui/RefreshButton.jsx";

export const EditConfigPage = () => {
    const {projectId, configId} = useParams()
    const navigate = useNavigate()

    const {data: project, isFetching: isProjectFetching, isError: isProjectError, error: projectError,
        refetch: refetchProject} = useGetProjectQuery(projectId, {
        refetchOnMountOrArgChange: true,
    })

    const {data: config, isFetching, isError, error, refetch} = useGetProjectConfigQuery(
        {projectId, configId},
        {
            refetchOnMountOrArgChange: true,
        },
    )

    const [updateProjectConfig, {isLoading: isSaving, isError: isSaveError, error: saveError}] =
        useUpdateProjectConfigMutation()

    const initialValues = useMemo(
        () => toConfigFormValues(config),
        [config]
    )

    const onSubmit = async (values) => {
        const payload = toConfigPayload(values)
        await updateProjectConfig({projectId, configId, ...payload}).unwrap()
        navigate(`/projects/${projectId}/configs/${configId}`)
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
                permission="canManageConfigs"
                redirectTo={`/projects/${projectId}/configs/${configId}`}
            >
                {() => (
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
                                title="Редактирование конфигурации"
                                backTo={`/projects/${projectId}/configs/${configId}`}
                                backLabel="К просмотру"
                                actions={
                                    <RefreshButton
                                        onClick={refetch}
                                        isLoading={isFetching}
                                    />
                                }
                            />
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
                    </QueryBoundary>
                )}
            </ProjectPermissionsBoundary>
        </QueryBoundary>
    )
}