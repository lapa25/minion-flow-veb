import {useMemo} from "react"
import {useNavigate, useParams} from "react-router-dom"
import {useGetProjectQuery, useUpdateProjectMutation} from "../store/projects/projectsApiSlice.js"
import {getApiErrorMessage} from "../utils/getApiErrorMessage.js"
import "./ProjectsPages.css"
import {ProjectForm} from "../components/projects/ProjectForm.jsx";
import {QueryBoundary} from "../components/guards/QueryBoundary.jsx";
import {RefreshButton} from "../components/ui/RefreshButton.jsx";
import {PageHeader} from "../components/layout/PageHeader.jsx";
import {ProjectPermissionsBoundary} from "../components/guards/ProjectPermissionsBoundary.jsx";

export const EditProjectPage = () => {
    const { projectId } = useParams()
    const navigate = useNavigate()

    const {data: project, isFetching, isError, error, refetch} = useGetProjectQuery(projectId,
        { refetchOnMountOrArgChange: true })

    const defaults = useMemo(
        () => ({
            name: project?.projectName ?? "",
            description: project?.projectDescription ?? "",
        }),
        [project]
    );

    const [updateProject, { isLoading: isSaving, isError: isSaveError, error: saveError }] =
        useUpdateProjectMutation()

    const onSubmit = async (values) => {
        await updateProject({
            projectId,
            name: values.name.trim(),
            description: values.description?.trim() ? values.description.trim() : "",
        }).unwrap()

        navigate(`/projects/${projectId}`)
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
            errorMessage={getApiErrorMessage(error)}
        >
            <ProjectPermissionsBoundary
                projectId={projectId}
                permission="canManageProject"
                redirectTo={`/projects/${projectId}`}>
                {() => (
                    <section className="projectsPage">
                        <PageHeader
                            title="Редактирование проекта"
                            backTo={`/projects/${projectId}`}
                            backLabel="Назад к проекту"
                            actions={
                                <RefreshButton
                                    onClick={refetch}
                                    isLoading={isFetching}
                                />
                            }
                        />
                        <ProjectForm
                            initialValues={defaults}
                            onSubmit={onSubmit}
                            isSubmitting={isSaving}
                            submitError={isSaveError ? saveError : null}
                            submitErrorTitle="Не удалось сохранить проект"
                            submitLabel="Сохранить"
                            submitLoadingLabel="Сохраняем..."
                            cancelTo={`/projects/${projectId}`}
                        />
                    </section>
                )}
            </ProjectPermissionsBoundary>
        </QueryBoundary>
    )
};