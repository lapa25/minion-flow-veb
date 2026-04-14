import {useCallback, useState} from "react"
import {useParams, Link} from "react-router-dom"
import {DebouncedSearchInput} from "../components/ui/DebouncedSearchInput.jsx"
import {useGetProjectQuery} from "../store/projects/projectsApiSlice.js"
import {useLazyGetProjectTasksQuery} from "../store/tasks/tasksApiSlice.js"
import {getApiErrorMessage} from "../utils/getApiErrorMessage.js"
import {formatDateTime} from "../utils/datetime.js"
import {PROJECT_ROLE} from "../utils/projectRole.js"
import "../styles/ProjectsPages.css"
import {useAsyncList} from "../hooks/useAsyncList.js";
import {loadAllPages} from "../utils/loadAllPages.js";
import {useClientList} from "../hooks/useClientList.js";
import {ListPageShell} from "../components/lists/ListPageShell.jsx";
import {PageHeader} from "../components/layout/PageHeader.jsx";
import {RefreshButton} from "../components/ui/RefreshButton.jsx";
import {ListSummaryCard} from "../components/lists/ListSummaryCard.jsx";
import {ListFiltersCard} from "../components/lists/ListFiltersCard.jsx";
import {ListTableCard} from "../components/lists/ListTableCard.jsx";
import {ListPagination} from "../components/lists/ListPagination.jsx";
import {QueryBoundary} from "../components/guards/QueryBoundary.jsx";
import {ProjectPermissionsBoundary} from "../components/guards/ProjectPermissionsBoundary.jsx";
import {LaunchTaskDialog} from "../components/tasks/LaunchTaskDialog.jsx";

const TASKS_PAGE_DEFAULTS = {
    q: "",
    status: "all",
    sort: "created_desc",
    page: 1,
    pageSize: 10,
}

const TASKS_SORTERS = {
    created_desc: (a, b) =>
        String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")),
    created_asc: (a, b) =>
        String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")),
    done_desc: (a, b) =>
        String(b.doneAt ?? "").localeCompare(String(a.doneAt ?? "")),
    done_asc: (a, b) =>
        String(a.doneAt ?? "").localeCompare(String(b.doneAt ?? "")),
}
const filterTasks = (items, {q, status}) => {
    let list = [...items]
    const needle = String(q ?? "").trim().toLowerCase()

    if (needle) {
        list = list.filter((item) =>
            String(item.taskId ?? "").toLowerCase().includes(needle) ||
            String(item.jarAlias ?? "").toLowerCase().includes(needle) ||
            String(item.inputAlias ?? "").toLowerCase().includes(needle) ||
            String(item.configAlias ?? "").toLowerCase().includes(needle)
        )
    }
    if (status !== "all") {
        list = list.filter((item) => item.status === status)
    }
    return list
}

const sortTasks = (items, {sort}) => {
    const sorter = TASKS_SORTERS[sort]
    if (!sorter) {
        return [...items]
    }
    return [...items].sort(sorter)
}

const ProjectTasksContent = ({projectId, project, projectRole, permissions, isResolved}) => {
    const [isLaunchOpen, setIsLaunchOpen] = useState(false)
    const [triggerGetProjectTasks] = useLazyGetProjectTasksQuery()

    const loadTasksData = useCallback(async () => {
        if (!projectId) {
            return []
        }
        return loadAllPages((params) =>
            triggerGetProjectTasks({ projectId, ...params }).unwrap()
        )
    }, [projectId, triggerGetProjectTasks])

    const {items: allTasks, isLoading: isLoadingAll, error: loadError, reload: loadTasks} = useAsyncList({
        enabled: Boolean(projectId) && isResolved && permissions?.canViewTasks,
        loader: loadTasksData,
    })

    const {params: {q, status, sort, page, pageSize}, updateParam, visibleItems: visibleTasks,
        total, totalPages} = useClientList({
        items: allTasks, defaults: TASKS_PAGE_DEFAULTS, filterFn: filterTasks, sortFn: sortTasks})

    const commitSearch = useCallback(
        (value) => updateParam("q", value),
        [updateParam]
    )

    return (
        <ListPageShell>
            <PageHeader
                title="Запуски"
                backTo={`/projects/${projectId}`}
                backLabel="Назад к проекту"
                actions={
                    <>
                        {permissions?.canManageTasks ? (
                            <button
                                className="projectsBtn"
                                type="button"
                                onClick={() => setIsLaunchOpen((prev) => !prev)}
                            >
                                {isLaunchOpen ? "Скрыть форму" : "Новый запуск"}
                            </button>
                        ) : null}
                        <RefreshButton
                            onClick={loadTasks}
                            isLoading={isLoadingAll}
                        />
                    </>
                }
            />
            <ListSummaryCard>
                <span className="pill">Проект: {project?.projectName ?? "—"}</span>
                <span className="pill">Моя роль: {PROJECT_ROLE[projectRole]}</span>
                <span className="pill">Всего запусков: {total}</span>
            </ListSummaryCard>
            {permissions?.canManageTasks ? (
                <LaunchTaskDialog
                    isOpen={isLaunchOpen}
                    projectId={projectId}
                    onClose={() => setIsLaunchOpen(false)}
                />
            ) : null}
            <ListFiltersCard>
                <DebouncedSearchInput
                    initialValue={q}
                    placeholder="Поиск по taskId / jar / input / config"
                    className="projectsInput"
                    onCommit={commitSearch}
                />
                <select
                    className="projectsSelect"
                    value={status}
                    onChange={(e) => updateParam("status", e.target.value)}
                >
                    <option value="all">Все статусы</option>
                    <option value="CREATED">CREATED</option>
                    <option value="STARTING">STARTING</option>
                    <option value="RUNNING">RUNNING</option>
                    <option value="FINISHED">FINISHED</option>
                    <option value="TIME_OUT">TIME_OUT</option>
                    <option value="CANCELED">CANCELED</option>
                    <option value="FAILED">FAILED</option>
                    <option value="DONE">DONE</option>
                </select>
                <select
                    className="projectsSelect"
                    value={sort}
                    onChange={(e) => updateParam("sort", e.target.value)}
                >
                    <option value="created_desc">Сначала новые</option>
                    <option value="created_asc">Сначала старые</option>
                    <option value="done_desc">Сначала поздно завершённые</option>
                    <option value="done_asc">Сначала рано завершённые</option>
                </select>
            </ListFiltersCard>
            <ListTableCard
                title="Список"
                error={loadError}
                errorTitle="Не удалось загрузить запуски"
                onRetry={loadTasks}
                isEmpty={!isLoadingAll && !visibleTasks.length}
                emptyText="Запусков пока нет"
                footer={
                    <ListPagination
                        page={page}
                        totalPages={totalPages}
                        pageSize={pageSize}
                        isLoading={isLoadingAll}
                        onPrev={() => updateParam("page", Math.max(1, page - 1))}
                        onNext={() => updateParam("page", Math.min(totalPages, page + 1))}
                    />
                }
            >
                <div className="projectsTableWrap">
                    <table className="projectsTable">
                        <thead>
                        <tr>
                            <th>Task ID</th>
                            <th>Status</th>
                            <th>Jar</th>
                            <th>Input</th>
                            <th>Config</th>
                            <th>Создан</th>
                            <th>Завершён</th>
                        </tr>
                        </thead>

                        <tbody>
                        {visibleTasks.map((task) => (
                            <tr key={task.taskId} className="projectsRowLink">
                                <td>
                                    <Link
                                        to={`/projects/${project.projectId}/tasks/${task.taskId}`}
                                        className="projectsTableMainLink"
                                    >
                                        {task.taskId}
                                    </Link>
                                </td>
                                <td>{task.status ?? "—"}</td>
                                <td>{task.jarAlias ?? "—"}</td>
                                <td>{task.inputAlias ?? "—"}</td>
                                <td>{task.configAlias ?? "—"}</td>
                                <td>{task.createdAt ? formatDateTime(task.createdAt) : "—"}</td>
                                <td>{task.doneAt ? formatDateTime(task.doneAt) : "—"}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </ListTableCard>
        </ListPageShell>
    )
}

export const ProjectTasksPage = () => {
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
                permission="canViewTasks"
                deniedMessage="У вас нет доступа к просмотру запусков этого проекта"
            >
                {({projectRole, permissions, isResolved}) => (
                    <ProjectTasksContent
                        projectId={projectId}
                        project={project}
                        projectRole={projectRole}
                        permissions={permissions}
                        isResolved={isResolved}
                    />
                )}
            </ProjectPermissionsBoundary>
        </QueryBoundary>
    )
}