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
import {useGetProjectQuery} from "../store/projects/projectsApiSlice.js"
import {useCancelProjectTaskMutation, useGetProjectTaskOutputsQuery, useGetProjectTaskQuery,
    useGetTaskProgressStreamQuery, useLazyGetTaskOutputContentQuery} from "../store/tasks/tasksApiSlice.js"
import {downloadBlob} from "../utils/downloadBlob.js"
import {getApiErrorMessage} from "../utils/getApiErrorMessage.js"
import {formatDateTime} from "../utils/datetime.js"
import {getStatusToneClassName, getTaskStatusLabel, TERMINAL_TASK_STATUSES} from "../utils/statuses.js"
import "../styles/ProjectsStatus.css"
import "../styles/ProjectsPages.css"
import {formatFileSize} from "../utils/fileSize.js";


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

    const {data: outputsData, isFetching: isOutputsFetching, isError: isOutputsError,
        error: outputsError, refetch: refetchOutputs} = useGetProjectTaskOutputsQuery(
        {projectId, taskId},
        {
            refetchOnMountOrArgChange: true,
        }
    )

    const {data: progress} = useGetTaskProgressStreamQuery(
        {taskId},
        {
            skip: !taskId,
        }
    )

    const [triggerDownloadOutput] = useLazyGetTaskOutputContentQuery()

    const [cancelProjectTask, {
            isLoading: isCanceling,
            isError: isCancelError,
            error: cancelError,
        }] = useCancelProjectTaskMutation()

    const launchSnapshot = progress?.config ?? null
    const snapshotJson = useMemo(
        () => (launchSnapshot ? JSON.stringify(launchSnapshot, null, 2) : ""),
        [launchSnapshot]
    )
    const outputs = outputsData?.outputs ?? []

    const microtasks = useMemo(
        () =>
            Object.values(progress?.microtasksByIndex ?? {}).sort(
                (a, b) => Number(a.displayIndex ?? 0) - Number(b.displayIndex ?? 0)
            ),
        [progress]
    )

    const effectiveStatus = progress?.status ?? task?.status
    const isCancelable = Boolean(
        effectiveStatus && !TERMINAL_TASK_STATUSES.includes(effectiveStatus)
    )
    const effectiveFinishedAt = progress?.finishedAt ?? task?.finishedAt
    const effectiveDoneAt = progress?.doneAt ?? task?.doneAt

    const handleRefresh = async () => {
        await Promise.all([refetchTask(), refetchOutputs()])
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
                                            isLoading={isTaskFetching || isOutputsFetching}
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
                            <PageCard title="Основное">
                                <div className="projectsPills">
                                    <span className={`pill ${getStatusToneClassName(effectiveStatus)}`}>
                                        Статус: {getTaskStatusLabel(effectiveStatus)}
                                    </span>
                                </div>
                                <div className="projectsPills">
                                    <span className="pill">Проект: {project?.projectName ?? "—"}</span>
                                    <span className="pill">Task ID: {task?.taskId ?? "—"}</span>
                                    <span className="pill">JAR: {task?.jarAlias ?? "—"}</span>
                                    <span className="pill">Input: {task?.inputAlias ?? "—"}</span>
                                    <span className="pill">Config: {task?.configAlias ?? "—"}</span>
                                    <span className="pill">Создан: {formatDateTime(task?.createdAt)}</span>
                                    <span className="pill">Начало: {formatDateTime(task?.startedAt)}</span>
                                    <span className="pill">Конец: {formatDateTime(effectiveFinishedAt)}</span>
                                    <span className="pill">Готово: {formatDateTime(effectiveDoneAt)}</span>
                                </div>
                            </PageCard>
                            <PageCard title="Snapshot запуска">
                                {launchSnapshot ? (
                                    <>
                                        <div className="projectsPills">
                                            <span className="pill">
                                                Type: {launchSnapshot?.type ?? "—"}
                                            </span>
                                            <span className="pill">
                                                CPU: {launchSnapshot?.worker?.resources?.cpu ?? "—"}
                                            </span>
                                            <span className="pill">
                                                Memory: {launchSnapshot?.worker?.resources?.memory ?? "—"}
                                            </span>
                                            <span className="pill">
                                                Bound: {launchSnapshot?.worker?.bound ?? "—"}
                                            </span>
                                            <span className="pill">
                                                Concurrency: {launchSnapshot?.worker?.concurrency ?? "—"}
                                            </span>
                                        </div>

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
                            <PageCard title="Прогресс выполнения">
                                <TaskExecutionOverview
                                    projectId={projectId}
                                    taskId={taskId}
                                    summary={progress?.summary}
                                    microtasks={microtasks}
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