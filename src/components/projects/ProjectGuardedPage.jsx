import {useParams} from "react-router-dom";
import {useGetProjectQuery} from "../../store/projects/projectsApiSlice.js";
import {QueryBoundary} from "../guards/QueryBoundary.jsx";
import {getApiErrorMessage} from "../../utils/getApiErrorMessage.js";
import {ProjectPermissionsBoundary} from "../guards/ProjectPermissionsBoundary.jsx";

export const ProjectGuardedPage = ({permission, deniedMessage, children}) => {
    const {projectId} = useParams()

    const {data: project, isFetching: isProjectFetching, isError: isProjectError,
        error: projectError, refetch: refetchProject} = useGetProjectQuery(projectId, {
        refetchOnMountOrArgChange: true,
    })

    return (
        <QueryBoundary
            isLoading={isProjectFetching}
            hasData={!!project}
            isError={isProjectError}
            error={projectError}
            onRetry={refetchProject}
            loadingLabel="Загружаем проект..."
            errorTitle="Не удалось загрузить проект"
            errorMessage={getApiErrorMessage(projectError)}
        >
            <ProjectPermissionsBoundary
                projectId={projectId}
                permission={permission}
                deniedMessage={deniedMessage}
            >
                {({projectRole, permissions}) =>
                    children({projectId, project, projectRole, permissions})
                }
            </ProjectPermissionsBoundary>
        </QueryBoundary>
    )
}