import {useMemo} from "react"
import {useParams} from "react-router-dom"
import {PageCard} from "../components/layout/PageCard.jsx"
import {PageHeader} from "../components/layout/PageHeader.jsx"
import {QueryBoundary} from "../components/guards/QueryBoundary.jsx"
import {ProjectPermissionsBoundary} from "../components/guards/ProjectPermissionsBoundary.jsx"
import {LiveLogsConsole} from "../components/microtasks/MicrotaskLogsConsole.jsx"
import {useGetProjectQuery} from "../store/projects/projectsApiSlice.js"
import {useGetMicrotaskLogsStreamQuery, useGetProjectMicrotaskQuery} from "../store/microtasks/microtasksApiSlice.js"
import {getApiErrorMessage} from "../utils/getApiErrorMessage.js"
import {formatDateTime} from "../utils/datetime.js"
import {getMicrotaskStatusLabel, getStatusToneClassName} from "../utils/statuses.js"
import "../styles/ProjectsPages.css"

export const MicrotaskDetailsPage = () => {
    const {projectId, taskId, microtaskId} = useParams()

    const {data: project, isFetching: isProjectFetching, isError: isProjectError, error: projectError,
        refetch: refetchProject} = useGetProjectQuery(projectId, {
        refetchOnMountOrArgChange: true,
    })

    const {data: microtask, isFetching: isMicrotaskFetching, isError: isMicrotaskError, error: microtaskError,
        refetch: refetchMicrotask} = useGetProjectMicrotaskQuery(
        {projectId, taskId, microtaskId},
        {
            refetchOnMountOrArgChange: true,
        }
    )

    const {data: logsState} = useGetMicrotaskLogsStreamQuery(
        {microtaskId},
        {
            skip: !microtaskId,
        }
    )

    const orderedLogs = useMemo(
        () =>
            Object.values(logsState?.logsBySeq ?? {}).sort(
                (a, b) => Number(a.seq ?? 0) - Number(b.seq ?? 0)
            ),
        [logsState]
    )

    const effectiveStatus = logsState?.status ?? microtask?.status

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
                permission="canViewTaskLogs"
                deniedMessage="У вас нет доступа к логам и деталям микрозадач"
            >
                {() => (
                    <QueryBoundary
                        isLoading={isMicrotaskFetching}
                        hasData={!!microtask}
                        isError={isMicrotaskError}
                        error={microtaskError}
                        onRetry={refetchMicrotask}
                        loadingLabel="Загружаем микрозадачу..."
                        errorTitle="Не удалось загрузить микрозадачу"
                        errorMessage={getApiErrorMessage(microtaskError)}
                    >
                        <section className="projectsPage">
                            <PageHeader
                                title={`Микрозадача ${microtask?.displayIndex ?? ""}`}
                                backTo={`/projects/${projectId}/tasks/${taskId}`}
                                backLabel="Назад к запуску"
                            />
                            <PageCard title="Основное">
                                <div className="projectsPills">
                                <span className={`pill ${getStatusToneClassName(effectiveStatus)}`}>
                                        Статус: {getMicrotaskStatusLabel(effectiveStatus)}
                                    </span>
                                </div>
                                <div className="projectsPills">
                                    <span className="pill">Проект: {project?.projectName ?? "—"}</span>
                                    <span className="pill">Task ID: {microtask?.microtaskId ? taskId : taskId}</span>
                                    <span className="pill">Microtask ID: {microtask?.microtaskId ?? microtaskId}</span>
                                    <span className="pill">Старт: {formatDateTime(microtask?.started_at)}</span>
                                    <span className="pill">Финиш: {formatDateTime(microtask?.finished_at)}</span>
                                </div>
                            </PageCard>
                            <PageCard title="Live-логи микрозадачи">
                                <LiveLogsConsole logs={orderedLogs} />
                            </PageCard>
                        </section>
                    </QueryBoundary>
                )}
            </ProjectPermissionsBoundary>
        </QueryBoundary>
    )
}