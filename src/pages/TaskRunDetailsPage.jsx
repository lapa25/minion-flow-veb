import {useMemo} from "react"
import {useParams} from "react-router-dom"
import {ErrorBanner} from "../components/ui/ErrorBanner.jsx"
import {InlineLoader} from "../components/ui/InlineLoader.jsx"
import {PageCard} from "../components/layout/PageCard.jsx"
import {PageHeader} from "../components/layout/PageHeader.jsx"
import {QueryBoundary} from "../components/guards/QueryBoundary.jsx"
import {ProjectPermissionsBoundary} from "../components/guards/ProjectPermissionsBoundary.jsx"
import {RefreshButton} from "../components/ui/RefreshButton.jsx"
import {TaskExecutionOverview} from "../components/tasks/TaskExecutionOverview.jsx"
import {useGetProjectMembersQuery, useGetProjectQuery} from "../store/projects/projectsApiSlice.js"
import {useCancelProjectTaskMutation, useGetProjectTaskOutputsQuery, useGetProjectTaskQuery,
    useGetTaskProgressStreamQuery, useGetTaskRuntimeStateQuery, useLazyGetTaskOutputContentQuery
} from "../store/tasks/tasksApiSlice.js"
import {downloadBlob} from "../utils/downloadBlob.js"
import {getApiErrorMessage} from "../utils/getApiErrorMessage.js"
import {formatDateTime} from "../utils/datetime.js"
import {getStatusToneClassName, getTaskStatusLabel, TERMINAL_TASK_STATUSES} from "../utils/statuses.js"
import {formatFileSize} from "../utils/fileSize.js"
import "../styles/ProjectsStatus.css"
import "../styles/ProjectsPages.css"
import {InfoTile} from "../components/microtasks/InfoTile.jsx"

const getTaskConfig = (task) =>
    task?.launchSnapshot ??
    task?.config ??
    task?.executionConfig ??
    null

const toIndexMap = (items = []) =>
    Object.fromEntries(
        items.filter((item) => Number.isFinite(Number(item?.displayIndex)))
             .map((item) => [Number(item.displayIndex), item]))

const buildProgressSnapshot = ({taskId, payload, executionType, fallbackConfig}) => {
    if (!payload) {
        return null
    }
    return {
        taskId,
        executionType,
        taskStatus: payload.taskStatus ?? null,
        seq: Number(payload.seq ?? 0),
        kind: payload.kind ?? null,
        summary: payload.summary ?? null,
        config: payload.config ?? fallbackConfig ?? null,
        microtasksByIndex: toIndexMap(payload.microtasks),
        agentStatesByIndex: toIndexMap(payload.agentStates),
        connectionStatus: "snapshot",
        finishedAt: payload.finishedAt ?? null,
        doneAt: payload.doneAt ?? null,
        wsError: null,
    }
}

const mergeProgressStates = (snapshot, live) => {
    if (!snapshot) {
        return live ?? null
    }
    if (!live) {
        return snapshot
    }
    return {
        ...snapshot,
        ...live,
        taskStatus: live.taskStatus ?? snapshot.taskStatus,
        summary: live.summary ?? snapshot.summary,
        config: live.config ?? snapshot.config,
        finishedAt: live.finishedAt ?? snapshot.finishedAt,
        doneAt: live.doneAt ?? snapshot.doneAt,
        microtasksByIndex: {
            ...(snapshot.microtasksByIndex ?? {}),
            ...(live.microtasksByIndex ?? {}),
        },
        agentStatesByIndex: {
            ...(snapshot.agentStatesByIndex ?? {}),
            ...(live.agentStatesByIndex ?? {}),
        },
    }
}

const getOrderedItems = (map) =>
    Object.values(map ?? {}).sort(
        (a, b) => Number(a?.displayIndex ?? 0) - Number(b?.displayIndex ?? 0)
    )

const RunOverviewCard = ({project, task, executionType, effectiveStatus, effectiveFinishedAt,
                             effectiveDoneAt, initiatorUsername}) => (
    <PageCard title="Общая информация">
        <div className="projectsPills">
            <span className={`pill ${getStatusToneClassName(effectiveStatus)}`}>
                {getTaskStatusLabel(effectiveStatus)}
            </span>
        </div>

        <div className="projectsInfoGrid">
            <InfoTile label="Проект" value={project?.projectName} />
            <InfoTile label="JAR файл" value={task?.jarAlias} />
            <InfoTile label="Тип запуска" value={executionType} />
            <InfoTile label="Датасет" value={task?.inputAlias} />
            <InfoTile label="Config" value={task?.configAlias} />
            <InfoTile label="Инициатор" value={initiatorUsername} />
            <InfoTile label="Создан" value={formatDateTime(task?.createdAt)} />
            <InfoTile label="Время запуска" value={formatDateTime(task?.startedAt)} />
            <InfoTile label="Время окончания" value={formatDateTime(effectiveFinishedAt)} />
            <InfoTile label="Готово" value={formatDateTime(effectiveDoneAt)} />
        </div>
    </PageCard>
)

export const TaskRunDetailsPage = () => {
    const {projectId, taskId} = useParams()

    const {data: project, isFetching: isProjectFetching, isError: isProjectError,
        error: projectError, refetch: refetchProject} = useGetProjectQuery(projectId, {
        refetchOnMountOrArgChange: true,
    })

    const {data: task, isFetching: isTaskFetching, isError: isTaskError,
        error: taskError, refetch: refetchTask} = useGetProjectTaskQuery(
        {projectId, taskId},
        {
            refetchOnMountOrArgChange: true,
        }
    )

    const taskConfig = getTaskConfig(task)
    const executionType = task?.executionType ?? taskConfig?.executionType ?? "stateless"
    const isSwarm = executionType === "swarm-sync"

    const {data: runtimeState, isFetching: isRuntimeStateFetching,
        refetch: refetchRuntimeState} = useGetTaskRuntimeStateQuery(
        {projectId, taskId, executionType},
        {
            skip: !projectId || !taskId || !task,
            refetchOnMountOrArgChange: true,
        }
    )

    const {data: outputsData, isFetching: isOutputsFetching, isError: isOutputsError,
        error: outputsError, refetch: refetchOutputs} = useGetProjectTaskOutputsQuery(
        {projectId, taskId},
        {
            refetchOnMountOrArgChange: true,
        }
    )

    const {data: liveProgress} = useGetTaskProgressStreamQuery(
        {taskId, executionType},
        {
            skip: !taskId || !task,
        }
    )

    const {data: membersData} = useGetProjectMembersQuery(
        {projectId, page: 0, size: 1000},
        {
            skip: !projectId,
        }
    )

    const progressSnapshot = useMemo(
        () =>
            buildProgressSnapshot({
                taskId,
                payload: runtimeState,
                executionType,
                fallbackConfig: taskConfig,
            }),
        [taskId, runtimeState, executionType, taskConfig]
    )

    const progress = useMemo(
        () => mergeProgressStates(progressSnapshot, liveProgress),
        [progressSnapshot, liveProgress]
    )

    const [triggerDownloadOutput] = useLazyGetTaskOutputContentQuery()

    const [cancelProjectTask, {
            isLoading: isCanceling,
            isError: isCancelError,
            error: cancelError,
        }] = useCancelProjectTaskMutation()

    const launchSnapshot = progress?.config ?? taskConfig ?? null

    const snapshotJson = useMemo(
        () => (launchSnapshot ? JSON.stringify(launchSnapshot, null, 2) : ""),
        [launchSnapshot]
    )
    const outputs = outputsData?.outputs ?? []

    const executionItems = useMemo(
        () =>
            isSwarm
                ? getOrderedItems(progress?.agentStatesByIndex)
                : getOrderedItems(progress?.microtasksByIndex),
        [isSwarm, progress]
    )

    const effectiveStatus = progress?.taskStatus ?? task?.taskStatus ?? task?.status
    const isCancelable = Boolean(
        effectiveStatus && !TERMINAL_TASK_STATUSES.includes(effectiveStatus)
    )
    const effectiveFinishedAt = progress?.finishedAt ?? task?.finishedAt
    const effectiveDoneAt = progress?.doneAt ?? task?.doneAt

    const projectMembers = membersData?.records ?? []
    const initiatorUsername =
        projectMembers.find((member) => member?.userId === task?.launchedByUser)?.username ??
        task?.initiator ?? task?.launchedByUser

    const handleRefresh = async () => {
        await Promise.all([refetchTask(), refetchRuntimeState(), refetchOutputs()])
    }

    const handleCancel = async (permissions) => {
        if (!permissions?.canManageTasks || !isCancelable) {
            return
        }
        if (!window.confirm("Остановить запуск?")) {
            return
        }
        await cancelProjectTask({projectId, taskId}).unwrap()
        await refetchTask()
    }

    const handleDownloadOutput = async (item) => {
        const outputId = item?.artifactId
        if (!outputId) {
            return
        }
        const blob = await triggerDownloadOutput({projectId, outputId}).unwrap()
        downloadBlob(blob, item?.originalName ?? `${outputId}.bin`)
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
                deniedMessage="У вас нет доступа к просмотру запусков этого проекта"
            >
                {({permissions}) => (
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
                        <section className="projectsPage">
                            <PageHeader
                                title={`Запуск ${task?.taskId ?? ""}`}
                                backTo={`/projects/${projectId}/tasks`}
                                backLabel="К списку запусков"
                                actions={
                                    <>
                                        <RefreshButton
                                            onClick={handleRefresh}
                                            isLoading={isTaskFetching || isOutputsFetching || isRuntimeStateFetching}
                                        />
                                        {permissions?.canManageTasks ? (
                                            <button
                                                className="projectsBtn"
                                                type="button"
                                                disabled={!isCancelable || isCanceling}
                                                onClick={() => handleCancel(permissions)}
                                            >
                                                {isCanceling ? <InlineLoader label="Останавливаем..." /> : "Остановить"}
                                            </button>
                                        ) : null}
                                    </>
                                }
                            />
                            {isCancelError ? (
                                <ErrorBanner
                                    title="Не удалось остановить запуск"
                                    message={getApiErrorMessage(cancelError)}
                                />
                            ) : null}
                            {progress?.wsError ? (
                                <ErrorBanner
                                    title="Ошибка WebSocket"
                                    message={progress.wsError}
                                />
                            ) : null}
                            {isSwarm ? (
                                <div className="projectsRunCardsGrid">
                                    <RunOverviewCard
                                        project={project}
                                        task={task}
                                        executionType={executionType}
                                        effectiveStatus={effectiveStatus}
                                        effectiveFinishedAt={effectiveFinishedAt}
                                        effectiveDoneAt={effectiveDoneAt}
                                        initiatorUsername={initiatorUsername}
                                    />
                                    <PageCard title="Конфигурация">
                                        <div className="projectsInfoGrid">
                                            <InfoTile label="Agents" value={progress?.summary?.total
                                                ?? launchSnapshot?.swarm?.agentCount} />
                                            <InfoTile label="Iterations" value={launchSnapshot?.swarm?.iterations} />
                                            <InfoTile label="Current iteration" value={progress?.summary?.currentIteration} />
                                            <InfoTile label="Batch size" value={launchSnapshot?.scheduling?.batchSize} />
                                            <InfoTile label="Topology type" value={launchSnapshot?.swarm?.topology?.type?.toUpperCase()} />
                                            <InfoTile label="Neighbors total" value={launchSnapshot?.swarm?.topology?.numberOfNeighbors} />
                                            <InfoTile label="Executor count" value={launchSnapshot?.scheduling?.parallelism
                                                ?? launchSnapshot?.scheduling?.maxParallelism} />
                                            <InfoTile label="Status" value={effectiveStatus} />
                                            <InfoTile label="Phase" value={progress?.summary?.currentPhase} />
                                        </div>
                                    </PageCard>
                                </div>
                            ) : (
                                <div className="projectsRunCardsGrid">
                                    <RunOverviewCard
                                        project={project}
                                        task={task}
                                        executionType={executionType}
                                        effectiveStatus={effectiveStatus}
                                        effectiveFinishedAt={effectiveFinishedAt}
                                        effectiveDoneAt={effectiveDoneAt}
                                        initiatorUsername={initiatorUsername}
                                    />

                                    <PageCard title="Конфигурация">
                                        <div className="projectsInfoGrid">
                                            <InfoTile label="Microtasks" value={progress?.summary?.total} />
                                            <InfoTile label="Scheduling mode" value={launchSnapshot?.scheduling?.mode} />
                                            <InfoTile label="Batch size" value={launchSnapshot?.scheduling?.batchSize} />
                                            <InfoTile
                                                label="Parallelism"
                                                value={
                                                    launchSnapshot?.scheduling?.parallelism ??
                                                    launchSnapshot?.scheduling?.maxParallelism
                                                }
                                            />
                                            <InfoTile label="Min parallelism" value={launchSnapshot?.scheduling?.minParallelism} />
                                            <InfoTile label="Worker bound" value={launchSnapshot?.worker?.bound} />
                                            <InfoTile label="Concurrency" value={launchSnapshot?.worker?.concurrency} />
                                            <InfoTile label="CPU" value={launchSnapshot?.worker?.resources?.cpu} />
                                            <InfoTile label="Memory" value={launchSnapshot?.worker?.resources?.memory} />
                                            <InfoTile label="Microtask timeout" value={launchSnapshot?.timeouts?.microtaskSeconds} />
                                            <InfoTile label="Task timeout" value={launchSnapshot?.timeouts?.taskSeconds} />
                                            <InfoTile label="Retry attempts" value={launchSnapshot?.retry?.maxAttempts} />
                                        </div>
                                    </PageCard>
                                </div>
                            )}
                            <PageCard title={"Snapshot запуска"}>
                                {launchSnapshot ? (
                                    <>
                                        <textarea
                                            className="projectsTextarea"
                                            readOnly
                                            value={snapshotJson}
                                        />
                                    </>
                                ) : (
                                    <p className="projectsHint">Snapshot запуска пока не получен</p>
                                )}
                            </PageCard>
                            <PageCard title={"Прогресс выполнения"}>
                                <TaskExecutionOverview
                                    projectId={projectId}
                                    taskId={taskId}
                                    executionType={executionType}
                                    summary={progress?.summary}
                                    items={executionItems}
                                    config={launchSnapshot}
                                />
                            </PageCard>
                            <PageCard title="Outputs">
                                {isOutputsError ? (
                                    <ErrorBanner
                                        title="Не удалось загрузить outputs"
                                        message={getApiErrorMessage(outputsError)}
                                        onRetry={refetchOutputs}
                                    />
                                ) : isOutputsFetching && !outputs.length ? (
                                    <InlineLoader label="Загружаем outputs..." />
                                ) : outputs.length ? (
                                    <div className="projectsTableWrap">
                                        <table className="projectsTable">
                                            <thead>
                                            <tr>
                                                <th>Output ID</th>
                                                <th>Имя</th>
                                                <th>Размер</th>
                                                <th>Тип</th>
                                                <th>Создан</th>
                                                <th></th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {outputs.map((item) => (
                                                <tr key={item?.artifactId}>
                                                    <td>{item?.artifactId ?? "—"}</td>
                                                    <td>{item?.originalName ?? "—"}</td>
                                                    <td>{formatFileSize(item?.size)}</td>
                                                    <td>{item?.contentType ?? "—"}</td>
                                                    <td>{formatDateTime(item?.createdAt)}</td>
                                                    <td>
                                                        {permissions?.canViewTaskOutputs ? (
                                                            <button
                                                                className="projectsBtn projectsBtnSecondary"
                                                                type="button"
                                                                onClick={() => handleDownloadOutput(item)}
                                                            >
                                                                Скачать
                                                            </button>
                                                        ) : null}
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="projectsHint">Outputs пока отсутствуют</p>
                                )}
                            </PageCard>
                        </section>
                    </QueryBoundary>
                )}
            </ProjectPermissionsBoundary>
        </QueryBoundary>
    )
}