import {useMemo} from "react"
import {useParams} from "react-router-dom"
import {PageCard} from "../components/layout/PageCard.jsx"
import {PageHeader} from "../components/layout/PageHeader.jsx"
import {QueryBoundary} from "../components/guards/QueryBoundary.jsx"
import {ProjectPermissionsBoundary} from "../components/guards/ProjectPermissionsBoundary.jsx"
import {useGetProjectQuery} from "../store/projects/projectsApiSlice.js"
import {useGetProjectTaskQuery, useGetSwarmAgentQuery, useGetTaskRuntimeStateQuery}
    from "../store/tasks/tasksApiSlice.js"
import {getApiErrorMessage} from "../utils/getApiErrorMessage.js"
import {getMicrotaskStatusLabel, getStatusToneClassName} from "../utils/statuses.js"
import "../styles/ProjectsPages.css"
import "../styles/ProjectsStatus.css"
import {formatDateTime} from "../utils/datetime.js";
import {InfoTile} from "../components/microtasks/InfoTile.jsx";

const prettyJsonLike = (value, fallback = "—") => {
    if (value === undefined || value === null) {
        return fallback
    }
    if (typeof value === "string") {
        const trimmed = value.trim()
        if (!trimmed) {
            return fallback
        }
        try {
            return JSON.stringify(JSON.parse(trimmed), null, 2)
        } catch {
            return value
        }
    }
    try {
        return JSON.stringify(value, null, 2)
    } catch {
        return String(value)
    }
}

export const AgentDetailsPage = () => {
    const {projectId, taskId, agentId} = useParams()

    const {data: project, isFetching: isProjectFetching, isError: isProjectError, error: projectError,
        refetch: refetchProject} = useGetProjectQuery(projectId, {
        refetchOnMountOrArgChange: true,
    })

    const {data: task, isFetching: isTaskFetching, isError: isTaskError, error: taskError,
        refetch: refetchTask} = useGetProjectTaskQuery(
        {projectId, taskId},
        {
            refetchOnMountOrArgChange: true,
        }
    )

    const {data: agent, isFetching: isAgentFetching, isError: isAgentError, error: agentError,
        refetch: refetchAgent} = useGetSwarmAgentQuery(
        {projectId, taskId, agentId},
        {
            skip: !projectId || !taskId || !agentId,
            refetchOnMountOrArgChange: true,
        }
    )

    const {data: runtimeState, isFetching: isRuntimeStateFetching, refetch: refetchRuntimeState,
    } = useGetTaskRuntimeStateQuery(
        {projectId, taskId, type: "swarm"},
        {
            skip: !projectId || !taskId,
            refetchOnMountOrArgChange: true,
        }
    )

    const runtimeAgentState = useMemo(
        () =>
            runtimeState?.agentStates?.find(
                (item) => item?.agentId === agentId
            ) ?? null,
        [runtimeState, agentId]
    )

    const agentStatus = runtimeAgentState?.status
    const agentDisplayIndex = runtimeAgentState?.displayIndex
    const agentPhase = agent?.statePhase ?? runtimeAgentState?.currentPhase
    const agentIteration = agent?.stateIteration ?? runtimeAgentState?.currentIteration

    const handleRefreshAgent = async () => {
        await Promise.all([refetchAgent(), refetchRuntimeState()])
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
            errorMessage={getApiErrorMessage(projectError)}
        >
            <ProjectPermissionsBoundary
                projectId={projectId}
                permission="canViewTasks"
                deniedMessage="У вас нет доступа к просмотру агентов этого запуска"
            >
                {() => (
                    <QueryBoundary
                        isLoading={isTaskFetching}
                        hasData={!!task}
                        isError={isTaskError}
                        error={taskError}
                        onRetry={refetchTask}
                        loadingLabel="Загружаем запуск..."
                        errorTitle="Не удалось загрузить запуск"
                        errorMessage={getApiErrorMessage(taskError)}
                    >
                        <QueryBoundary
                            isLoading={isAgentFetching || isRuntimeStateFetching}
                            hasData={!!agent}
                            isError={isAgentError}
                            error={agentError}
                            onRetry={handleRefreshAgent}
                            loadingLabel="Загружаем агента..."
                            errorTitle="Не удалось загрузить агента"
                            errorMessage={getApiErrorMessage(agentError)}
                        >
                            <section className="projectsPage">
                                <PageHeader
                                    title={`Агент ${agentDisplayIndex ?? agent?.agentIndex ?? ""}`}
                                    backTo={`/projects/${projectId}/tasks/${taskId}`}
                                    backLabel="Назад к запуску"
                                />
                                <PageCard title="Основное">
                                    <div className="projectsPills">
                                        <span className={`pill ${getStatusToneClassName(agentStatus)}`}>
                                            Статус: {getMicrotaskStatusLabel(agentStatus)}
                                        </span>
                                    </div>
                                    <div className="projectsInfoGrid">
                                        <InfoTile label="Проект" value={project?.projectName} />
                                        <InfoTile label="Task ID" value={taskId} />
                                        <InfoTile label="Agent ID" value={agent?.agentId ?? agentId} />
                                        <InfoTile label="Agent index" value={agent?.agentIndex} />
                                        <InfoTile label="Phase" value={agentPhase} />
                                        <InfoTile label="Iteration" value={agentIteration} />
                                        <InfoTile label="Создан" value={formatDateTime(task?.createdAt)} />
                                        <InfoTile label="Старт запуска" value={formatDateTime(task?.startedAt)} />
                                        <InfoTile label="Финиш запуска" value={formatDateTime(task?.finishedAt)} />
                                        <InfoTile label="Готово" value={formatDateTime(task?.doneAt)} />
                                    </div>
                                </PageCard>
                                <div className="projectsRunCardsGrid projectsAgentDataGrid">
                                    <PageCard title="Input data">
                                        <pre className="projectsCodeBlock">
                                            {prettyJsonLike(agent?.inputData)}
                                        </pre>
                                    </PageCard>
                                    <PageCard title="State data">
                                        <pre className="projectsCodeBlock">
                                            {prettyJsonLike(agent?.stateData)}
                                        </pre>
                                    </PageCard>
                                </div>
                            </section>
                        </QueryBoundary>
                    </QueryBoundary>
                )}
            </ProjectPermissionsBoundary>
        </QueryBoundary>
    )
}