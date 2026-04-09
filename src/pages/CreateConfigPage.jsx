import {useNavigate, useParams} from "react-router-dom"
import {ErrorBanner} from "../components/ui/ErrorBanner.jsx"
import {ConfigForm} from "../components/configs/ConfigForm.jsx"
import {useGetProjectQuery} from "../store/projects/projectsApiSlice.js"
import {useCreateProjectConfigMutation} from "../store/configs/configsApiSlice.js"
import {getApiErrorMessage} from "../utils/getApiErrorMessage.js"
import {configFormDefaultValues, toConfigPayload} from "../validation/configsSchemas.js"
import {ProjectPermissionsBoundary} from "../components/guards/ProjectPermissionsBoundary.jsx";
import {PageHeader} from "../components/layout/PageHeader.jsx";
import {PageCard} from "../components/layout/PageCard.jsx";
import {QueryBoundary} from "../components/guards/QueryBoundary.jsx";

export const CreateConfigPage = () => {
    const {projectId} = useParams()
    const navigate = useNavigate()

    const {data: project, isFetching, isError, error, refetch} = useGetProjectQuery(projectId, {
        refetchOnMountOrArgChange: true
    })

    const [createProjectConfig, {isLoading, isError: isSaveError, error: saveError}] =
        useCreateProjectConfigMutation()

    const onSubmit = async (values) => {
        const payload = toConfigPayload(values)
        const createdConfig = await createProjectConfig({projectId, ...payload}).unwrap()
        navigate(`/projects/${projectId}/configs/${createdConfig.configId}`)
    }

    return (
        <QueryBoundary
            isLoading={isFetching}
            hasData={!!project}
            isError={isError}
            error={error}
            onRetry={refetch}
            loadingLabel="Загружаем проект..."
            errorTitle="Не удалось загрузить проект"
            errorMessage={getApiErrorMessage(error, "Ошибка загрузки проекта")}
        >
            <ProjectPermissionsBoundary
                projectId={projectId}
                permission="canManageConfigs"
                redirectTo={`/projects/${projectId}/configs`}
            >
                {() => (
                    <section className="projectsPage">
                        <PageHeader
                            title="Новая конфигурация"
                            backTo={`/projects/${projectId}/configs`}
                            backLabel="К списку конфигураций"
                        />
                        <PageCard>
                            {isSaveError ? (
                                <ErrorBanner
                                    title="Не удалось создать конфигурацию"
                                    message={getApiErrorMessage(saveError, "Ошибка создания конфигурации")}
                                />
                            ) : null}
                            <ConfigForm
                                mode="create"
                                initialValues={configFormDefaultValues}
                                isSubmitting={isLoading}
                                onSubmit={onSubmit}
                            />
                        </PageCard>
                    </section>
                )}
            </ProjectPermissionsBoundary>
        </QueryBoundary>
    )
}