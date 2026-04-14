import {useCallback} from "react"
import {Link, useParams} from "react-router-dom"
import {DebouncedSearchInput} from "../components/ui/DebouncedSearchInput.jsx"
import {useGetProjectQuery} from "../store/projects/projectsApiSlice.js"
import {formatDateTime} from "../utils/datetime.js"
import {getApiErrorMessage} from "../utils/getApiErrorMessage.js"
import {PROJECT_ROLE} from "../utils/projectRole.js"
import "../styles/ProjectsPages.css"
import {useLazyGetProjectConfigQuery, useLazyGetProjectConfigsQuery} from "../store/configs/configsApiSlice.js";
import {loadAllPages} from "../utils/loadAllPages.js";
import {useAsyncList} from "../hooks/useAsyncList.js";
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

const CONFIGS_PAGE_DEFAULTS = {
    q: "",
    type: "all",
    sort: "created_desc",
    page: 1,
    pageSize: 10,
}

const CONFIGS_SORTERS = {
    created_desc: (a, b) =>
        String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")),
    created_asc: (a, b) =>
        String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")),
    name_asc: (a, b) =>
        String(a.alias ?? "").localeCompare(String(b.alias ?? "")),
    name_desc: (a, b) =>
        String(b.alias ?? "").localeCompare(String(a.alias ?? "")),
}

const filterConfigs = (items, {q, type}) => {
    let list = [...items]
    const needle = String(q ?? "").trim().toLowerCase()
    if (needle) {
        list = list.filter((item) =>
            String(item.alias ?? "").toLowerCase().includes(needle)
        )
    }
    if (type !== "all") {
        list = list.filter((item) => item?.config?.type === type)
    }
    return list
}

const sortConfigs = (items, {sort}) => {
    const sorter = CONFIGS_SORTERS[sort]
    if (!sorter) {
        return [...items]
    }
    return [...items].sort(sorter)
}

const ProjectConfigsContent = ({projectId, project, projectRole, permissions, isResolved}) => {
    const [triggerGetProjectConfigs] = useLazyGetProjectConfigsQuery()
    const [triggerGetProjectConfig] = useLazyGetProjectConfigQuery()

    const loadConfigsData = useCallback(async () => {
        if (!projectId) {
            return []
        }
        const allLight = await loadAllPages((params) =>
            triggerGetProjectConfigs({ projectId, ...params }).unwrap()
        )
        return Promise.all(
            allLight.map((item) => triggerGetProjectConfig({
                    projectId,
                    configId: item.configId
            }).unwrap())
        )
    }, [projectId, triggerGetProjectConfigs, triggerGetProjectConfig])

    const {items: allConfigs, isLoading: isLoadingAll, error: loadError, reload: loadConfigs} =
        useAsyncList({enabled: Boolean(projectId) && isResolved && permissions?.canViewConfigs,
        loader: loadConfigsData,
    })

    const {params: {q, type, sort, page, pageSize}, updateParam, visibleItems: visibleConfigs,
        total, totalPages} = useClientList({items: allConfigs, defaults: CONFIGS_PAGE_DEFAULTS,
        filterFn: filterConfigs, sortFn: sortConfigs})

    const commitSearch = useCallback(
        (value) => updateParam("q", value),
        [updateParam]
    )

    return (
        <ListPageShell>
            <PageHeader
                title="Конфигурации"
                backTo={`/projects/${projectId}`}
                backLabel="Назад к проекту"
                actions={
                    <>
                        <RefreshButton
                            onClick={loadConfigs}
                            isLoading={isLoadingAll}
                        />
                        {permissions?.canManageConfigs ? (
                            <Link className="projectsBtn" to={`/projects/${projectId}/configs/new`}>
                                Создать конфигурацию
                            </Link>
                        ) : null}
                    </>
                }
            />
            <ListSummaryCard>
                <span className="pill">Проект: {project?.projectName ?? "—"}</span>
                <span className="pill">Моя роль: {PROJECT_ROLE[projectRole] ?? projectRole}</span>
                <span className="pill">Всего: {total}</span>
            </ListSummaryCard>
            <ListFiltersCard>
                <DebouncedSearchInput
                    key={q}
                    initialValue={q}
                    placeholder="Поиск по alias"
                    className="projectsInput"
                    onCommit={commitSearch}
                />
                <select
                    className="projectsSelect"
                    value={type}
                    onChange={(e) => updateParam("type", e.target.value)}
                >
                    <option value="all">Все типы</option>
                    <option value="stateless">stateless</option>
                    <option value="stateful">stateful</option>
                </select>
                <select
                    className="projectsSelect"
                    value={sort}
                    onChange={(e) => updateParam("sort", e.target.value)}
                >
                    <option value="created_desc">Сначала новые</option>
                    <option value="created_asc">Сначала старые</option>
                    <option value="name_asc">Alias A→Z</option>
                    <option value="name_desc">Alias Z→A</option>
                </select>
            </ListFiltersCard>
            <ListTableCard
                title="Список"
                error={loadError}
                errorTitle="Не удалось загрузить конфигурации"
                onRetry={loadConfigs}
                isEmpty={!isLoadingAll && !visibleConfigs.length}
                emptyText="Конфигураций пока нет"
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
                            <th>Alias</th>
                            <th>Тип</th>
                            <th>Owner ID</th>
                            <th>Создана</th>
                        </tr>
                        </thead>
                        <tbody>
                        {visibleConfigs.map((config) => (
                            <tr key={config.configId} className="projectsRowLink">
                                <td>
                                    <Link
                                        to={`/projects/${projectId}/configs/${config.configId}`}
                                        className="projectsTableMainLink"
                                    >
                                        {config.alias ?? "—"}
                                    </Link>
                                </td>
                                <td>{config?.config?.type ?? "—"}</td>
                                <td>{config.ownerId ?? "—"}</td>
                                <td>{config.createdAt ? formatDateTime(config.createdAt) : "—"}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </ListTableCard>
        </ListPageShell>
    )
}

export const ProjectConfigsPage = () => {
    const {projectId} = useParams()

    const {data: project, isFetching: isProjectFetching, isError: isProjectError, error: projectError,
        refetch: refetchProject} = useGetProjectQuery(projectId, {
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
            errorMessage={getApiErrorMessage(projectError, "Ошибка загрузки проекта")}
        >
            <ProjectPermissionsBoundary
                projectId={projectId}
                permission="canViewConfigs"
                deniedMessage="У вас нет доступа к просмотру конфигураций этого проекта"
            >
                {({projectRole, permissions, isResolved}) => (
                    <ProjectConfigsContent
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