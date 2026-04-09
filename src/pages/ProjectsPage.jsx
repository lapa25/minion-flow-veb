import {useCallback} from "react"
import {Link} from "react-router-dom"
import {useLazyGetProjectsQuery,
    useLazyGetProjectMembersQuery} from "../store/projects/projectsApiSlice.js"
import "./ProjectsPages.css"
import {PROJECT_ROLE, getProjectRole} from "../utils/projectRole.js";
import {DebouncedSearchInput} from "../components/ui/DebouncedSearchInput.jsx";
import { useSelector } from "react-redux"
import { selectCurrentUser } from "../store/auth/authSelectors.js"
import {loadAllPages} from "../utils/loadAllPages.js";
import {useAsyncList} from "../hooks/useAsyncList.js";
import {useClientList} from "../hooks/useClientList.js";
import {ListPageShell} from "../components/lists/ListPageShell.jsx";
import {PageHeader} from "../components/layout/PageHeader.jsx";
import {RefreshButton} from "../components/ui/RefreshButton.jsx";
import {ListFiltersCard} from "../components/lists/ListFiltersCard.jsx";
import {ListTableCard} from "../components/lists/ListTableCard.jsx";
import {ListPagination} from "../components/lists/ListPagination.jsx";

const PROJECTS_PAGE_DEFAULTS = {
    q: "",
    sort: "name_asc",
    page: 1,
    pageSize: 10,
}

const PROJECTS_SORTERS = {
    name_asc: (a, b) =>
        String(a.projectName ?? "").localeCompare(String(b.projectName ?? "")),
    name_desc: (a, b) =>
        String(b.projectName ?? "").localeCompare(String(a.projectName ?? "")),
    id_asc: (a, b) =>
        String(a.projectId ?? "").localeCompare(String(b.projectId ?? "")),
    id_desc: (a, b) =>
        String(b.projectId ?? "").localeCompare(String(a.projectId ?? "")),
}

const filterProjects = (items, {q}) => {
    let list = [...items]
    const needle = String(q ?? "").trim().toLowerCase()

    if (needle) {
        list = list.filter((item) =>
            String(item.projectName ?? "").toLowerCase().includes(needle)
        )
    }

    return list
}

const sortProjects = (items, {sort}) => {
    const sorter = PROJECTS_SORTERS[sort]
    if (!sorter) {
        return [...items]
    }
    return [...items].sort(sorter)
}

export const ProjectsPage = () => {
    const currentUser = useSelector(selectCurrentUser)

    const [triggerGetProjects] = useLazyGetProjectsQuery()
    const [triggerGetProjectMembers] = useLazyGetProjectMembersQuery()

    const loadProjectsData = useCallback(async () => {
        const allProjects = await loadAllPages((params) =>
            triggerGetProjects(params).unwrap()
        )
        const rolesEntries = await Promise.all(
            allProjects.map(async (project) => {
                const allMembers = await loadAllPages((params) =>
                    triggerGetProjectMembers({
                        projectId: project.projectId,
                        ...params,
                    }).unwrap()
                )
                const role = getProjectRole(allMembers, currentUser?.userId)
                return [project.projectId, role]
            })
        )
        const rolesByProjectId = Object.fromEntries(rolesEntries)
        return allProjects.map((project) => ({
            ...project,
            currentUserRole: rolesByProjectId[project.projectId] ?? "user",
        }))
    }, [triggerGetProjects, triggerGetProjectMembers, currentUser?.userId])

    const {items: allProjects, isLoading: isLoadingAll, error: loadError, reload: loadProjects} =
        useAsyncList({enabled: true, loader: loadProjectsData})

    const {params: {q, sort, page, pageSize}, updateParam, visibleItems: visibleProjects,
        total, totalPages} = useClientList({items: allProjects, defaults: PROJECTS_PAGE_DEFAULTS,
        filterFn: filterProjects, sortFn: sortProjects})

    const commitSearch = useCallback(
        (value) => updateParam("q", value),
        [updateParam]
    )
    return (
        <ListPageShell>
            <PageHeader
                title="Проекты"
                actions={
                    <>
                        <RefreshButton
                            onClick={loadProjects}
                            isLoading={isLoadingAll}
                        />
                        <Link className="projectsBtn" to="/projects/new">
                            Создать проект
                        </Link>
                    </>
                }
            >
                <div className="projectsPills">
                    <span className="pill">Всего: {total}</span>
                    {isLoadingAll ? <span className="pill">Обновляем…</span> : null}
                </div>
            </PageHeader>
            <ListFiltersCard>
                <DebouncedSearchInput
                    key={q}
                    initialValue={q}
                    placeholder="Поиск по названию"
                    className="projectsInput"
                    onCommit={commitSearch}
                />
                <select
                    className="projectsSelect"
                    value={sort}
                    onChange={(e) => updateParam("sort", e.target.value)}
                >
                    <option value="name_asc">Название A→Z</option>
                    <option value="name_desc">Название Z→A</option>
                    <option value="id_asc">Project ID A→Z</option>
                    <option value="id_desc">Project ID Z→A</option>
                </select>
            </ListFiltersCard>
            <ListTableCard
                title="Список"
                error={loadError}
                errorTitle="Не удалось загрузить проекты"
                onRetry={loadProjects}
                isEmpty={!isLoadingAll && !visibleProjects.length}
                emptyText="Проектов нет - создайте первый проект"
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
                            <th>Project ID</th>
                            <th>Название</th>
                            <th>Роль</th>
                        </tr>
                        </thead>
                        <tbody>
                        {visibleProjects.map((project) => (
                            <tr key={project.projectId} className="projectsRowLink">
                                <td>
                                    <Link
                                        to={`/projects/${project.projectId}`}
                                        className="projectsTableMainLink"
                                    >
                                        {project.projectId}
                                    </Link>
                                </td>
                                <td>{project.projectName ?? "—"}</td>
                                <td>{PROJECT_ROLE[project.currentUserRole] ?? project.currentUserRole}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </ListTableCard>
        </ListPageShell>
    )
}