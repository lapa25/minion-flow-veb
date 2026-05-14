import {useMemo} from "react"
import {useParams} from "react-router-dom"
import {PageCard} from "../components/layout/PageCard.jsx"
import {PageHeader} from "../components/layout/PageHeader.jsx"
import {QueryBoundary} from "../components/guards/QueryBoundary.jsx"
import {ProjectPermissionsBoundary} from "../components/guards/ProjectPermissionsBoundary.jsx"
import {LiveLogsConsole} from "../components/microtasks/MicrotaskLogsConsole.jsx"
import {useGetProjectQuery} from "../store/projects/projectsApiSlice.js"
import {useGetTaskRuntimeMicrotaskQuery} from "../store/tasks/tasksApiSlice.js"
import {useGetMicrotaskLogsBacklogQuery, useGetMicrotaskLogsStreamQuery} from "../store/microtasks/microtasksApiSlice.js"
import {getApiErrorMessage} from "../utils/getApiErrorMessage.js"
import {formatDateTime} from "../utils/datetime.js"
import {getMicrotaskStatusLabel, getStatusToneClassName} from "../utils/statuses.js"
import "../styles/ProjectsPages.css"
import {InfoTile} from "../components/microtasks/InfoTile.jsx";

export const MicrotaskDetailsPage = () => {
    const {projectId, taskId, microtaskId} = useParams()

    const {data: project, isFetching: isProjectFetching, isError: isProjectError, error: projectError,
        refetch: refetchProject} = useGetProjectQuery(projectId, {
        refetchOnMountOrArgChange: true,
    })

    const {data: microtask, isFetching: isMicrotaskFetching, isError: isMicrotaskError,
        error: microtaskError, refetch: refetchMicrotask} = useGetTaskRuntimeMicrotaskQuery(
        {projectId, taskId, microtaskId},
        {
            skip: !projectId || !taskId || !microtaskId,
            refetchOnMountOrArgChange: true,
        }
    )

    const {data: logsBacklog, isFetching: isLogsBacklogFetching, isError: isLogsBacklogError,
        error: logsBacklogError, refetch: refetchLogsBacklog} = useGetMicrotaskLogsBacklogQuery(
        {projectId, microtaskId, afterSeq: -1, limit: 1000},
        {
            skip: !projectId || !microtaskId,
            refetchOnMountOrArgChange: true,
        }
    )

    const {data: logsState} = useGetMicrotaskLogsStreamQuery(
        {microtaskId},
        {
            skip: !microtaskId,
        }
    )

    const orderedLogs = useMemo(() => {
        const logsBySeq = {};

        (logsBacklog?.logs ?? []).forEach((item) => {
            const seq = Number(item?.seq)

            if (Number.isFinite(seq)) {
                logsBySeq[seq] = {
                    seq,
                    loglevel: item?.loglevel ?? "INFO",
                    timestamp: item?.timestamp ?? "",
                    message: item?.message ?? "",
                }
            }
        })

        Object.values(logsState?.logsBySeq ?? {}).forEach((item) => {
            const seq = Number(item?.seq)

            if (Number.isFinite(seq)) {
                logsBySeq[seq] = item
            }
        })

        return Object.values(logsBySeq).sort(
            (a, b) => Number(a.seq ?? 0) - Number(b.seq ?? 0)
        )
    }, [logsBacklog, logsState])

    const effectiveStatus = microtask?.status

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
                permission="canViewTasks"
                deniedMessage="У вас нет доступа к деталям микрозадач"
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
                                <div className="projectsInfoGrid">
                                    <InfoTile label="Проект" value={project?.projectName} />
                                    <InfoTile label="Task ID" value={taskId} />
                                    <InfoTile label="Microtask ID" value={microtask?.microtaskId ?? microtaskId} />
                                    <InfoTile label="Display index" value={microtask?.displayIndex} />
                                    <InfoTile label="Создана" value={formatDateTime(microtask?.createdAt)} />
                                    <InfoTile label="Старт" value={formatDateTime(microtask?.startedAt)} />
                                    <InfoTile label="Финиш" value={formatDateTime(microtask?.finishedAt)} />
                                    <InfoTile label="Deadline" value={formatDateTime(microtask?.runDeadline)} />
                                    <InfoTile label="Timeout seconds" value={microtask?.runTimeoutSeconds} />
                                    <InfoTile label="Reason" value={microtask?.reason || "—"} />
                                </div>
                            </PageCard>
                            <PageCard title="Live-логи микрозадачи">
                                {isLogsBacklogError ? (
                                    <p className="projectsHint">
                                        Не удалось загрузить backlog логов: {getApiErrorMessage(logsBacklogError)}
                                    </p>
                                ) : null}
                                {logsState?.wsError ? (
                                    <p className="projectsHint">
                                        Ошибка WebSocket логов: {logsState.wsError}
                                    </p>
                                ) : null}
                                {isLogsBacklogFetching && !orderedLogs.length ? (
                                    <p className="projectsHint">Загружаем backlog логов...</p>
                                ) : null}
                                <LiveLogsConsole logs={orderedLogs} />
                                {isLogsBacklogError ? (
                                    <button
                                        className="projectsBtn projectsBtnSecondary"
                                        type="button"
                                        onClick={refetchLogsBacklog}
                                    >
                                        Повторить загрузку backlog
                                    </button>
                                ) : null}
                            </PageCard>
                        </section>
                    </QueryBoundary>
                )}
            </ProjectPermissionsBoundary>
        </QueryBoundary>
    )
}