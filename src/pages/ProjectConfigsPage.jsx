import {useCallback, useMemo} from "react"
import {Link, useNavigate, useParams} from "react-router-dom"
import {useSelector} from "react-redux"

import {DebouncedSearchInput} from "../components/ui/DebouncedSearchInput.jsx"
import {ErrorBanner} from "../components/ui/ErrorBanner.jsx"
import {InlineLoader} from "../components/ui/InlineLoader.jsx"
import {useListSearchParams} from "../utils/search.js"

import {selectCurrentUser} from "../store/auth/authSelectors.js"
import {useGetProjectQuery} from "../store/projects/projectsApiSlice.js"
import {useGetProjectConfigsQuery} from "../store/configs/configsApiSlice.js"

import {formatDateTime} from "../utils/datetime.js"
import {getApiErrorMessage} from "../utils/getApiErrorMessage.js"
import {getProjectPermissions} from "../utils/projectPermissions.js"
import {getProjectRole, PROJECT_ROLE} from "../utils/projectRole.js"

import "./ProjectsPages.css"

const CONFIGS_PAGE_DEFAULTS = {
    q: "",
    type: "all",
    scheduling: "all",
    sort: "updated_desc",
    page: 1,
    pageSize: 10,
}

const getConfigType = (config) => config?.spec?.execution?.type ?? "—"
const getSchedulingMode = (config) => config?.spec?.execution?.scheduling?.mode ?? "—"
const getWorkerBound = (config) => config?.spec?.execution?.worker?.bound ?? "—"
const getCpu = (config) => config?.spec?.execution?.worker?.resources?.cpu ?? "—"
const getMemory = (config) => config?.spec?.execution?.worker?.resources?.memory ?? "—"
const getConcurrency = (config) => config?.spec?.execution?.worker?.concurrency ?? "—"
const getMaxAttempts = (config) => config?.spec?.execution?.retry?.maxAttempts ?? "—"

export const ProjectConfigsPage = () => {
    const {projectId} = useParams()
    const navigate = useNavigate()
    const currentUser = useSelector(selectCurrentUser)

    const {
        params: {q, type, scheduling, sort, page, pageSize},
        updateParam} = useListSearchParams(CONFIGS_PAGE_DEFAULTS)

    const {data: project, isFetching: isProjectFetching, isError: isProjectError,
        error: projectError, refetch: refetchProject} = useGetProjectQuery(projectId, {
        refetchOnMountOrArgChange: true,
    })

    const projectRole = getProjectRole(project, currentUser)
    const permissions = getProjectPermissions(projectRole)

    const queryArgs = useMemo(
        () => ({projectId, q: q || undefined, type: type !== "all" ? type : undefined,
            scheduling: scheduling !== "all" ? scheduling : undefined,
            sort, page, pageSize}),
        [projectId, q, type, scheduling, sort, page, pageSize]
    )

    const {data, isFetching, isError, error, refetch} = useGetProjectConfigsQuery(queryArgs, {
        refetchOnMountOrArgChange: true,
        skip: !permissions.canViewConfigs,
    })

    const items = data?.items ?? []
    const total = data?.total ?? 0
    const totalPages = Math.max(1, Math.ceil(total / pageSize))

    const commitSearch = useCallback(
        (value) => updateParam("q", value),
        [updateParam]
    )

    if (isProjectFetching && !project) {
        return (
            <section className="projectsSection">
                <div className="projectsCard">
                    <InlineLoader label="Загружаем проект..." />
                </div>
            </section>
        )
    }

    if (isProjectError) {
        return (
            <section className="projectsSection">
                <div className="projectsCard">
                    <h2>Конфигурации</h2>
                    <ErrorBanner
                        title="Не удалось загрузить проект"
                        message={getApiErrorMessage(projectError, "Ошибка загрузки проекта")}
                        onRetry={refetchProject}
                    />
                </div>
            </section>
        )
    }

    if (!permissions.canViewConfigs) {
        return (
            <section className="projectsSection">
                <div className="projectsCard">
                    <h2>Конфигурации</h2>
                    <ErrorBanner
                        title="Недостаточно прав"
                        message="У вас нет доступа к просмотру конфигураций этого проекта"
                    />
                </div>
            </section>
        )
    }

    return (
        <section className="projectsPage">
            <section className="projectsSection">
                <div className="projectsHeader">
                    <div>
                        <h2>Конфигурации</h2>
                        <p>
                            <Link to={`/projects/${projectId}`} className="line">
                                ← Назад к проекту
                            </Link>
                        </p>
                    </div>

                    <div className="projectsActions">
                        <button
                            className="projectsBtn projectsBtnSecondary"
                            onClick={() => refetch()}
                            disabled={isFetching}
                            type="button">
                            {isFetching ? <InlineLoader label="Обновляем..." /> : "Обновить"}
                        </button>

                        {permissions.canManageConfigs ? (
                            <Link className="projectsBtn" to={`/projects/${projectId}/configs/new`}>
                                Создать конфигурацию
                            </Link>
                        ) : null}
                    </div>
                </div>

                <div className="projectsCard">
                    <div className="projectsPills">
                        <span className="pill">Проект: {project?.name ?? "—"}</span>
                        <span className="pill">Моя роль: {PROJECT_ROLE[projectRole] ?? projectRole}</span>
                        <span className="pill">Всего: {total}</span>
                    </div>
                </div>

                <div className="projectsCard">
                    {isError ? (
                        <ErrorBanner
                            title="Не удалось загрузить конфигурации"
                            message={getApiErrorMessage(error, "Ошибка загрузки конфигураций")}
                            onRetry={refetch}
                        />
                    ) : null}

                    <h3>Фильтры</h3>

                    <div className="projectsFilters">
                        <DebouncedSearchInput
                            key={q}
                            initialValue={q}
                            placeholder="Поиск по названию"
                            className="projectsInput"
                            onCommit={commitSearch}
                        />

                        <select
                            className="projectsSelect"
                            value={type}
                            onChange={(e) => updateParam("type", e.target.value)}>
                            <option value="all">Все типы</option>
                            <option value="stateless">stateless</option>
                            <option value="stateful">stateful</option>
                        </select>

                        <select
                            className="projectsSelect"
                            value={sort}
                            onChange={(e) => updateParam("sort", e.target.value)}>
                            <option value="updated_desc">Сначала новые</option>
                            <option value="updated_asc">Сначала старые</option>
                            <option value="name_asc">Название A→Z</option>
                            <option value="name_desc">Название Z→A</option>
                        </select>
                    </div>
                </div>

                <div className="projectsCard">
                    <h3>Список</h3>

                    {!isFetching && !items.length ? (
                        <p className="projectsHint">Конфигураций пока нет</p>
                    ) : (
                        <div className="projectsTableWrap">
                            <table className="projectsTable">
                                <thead>
                                <tr>
                                    <th>Название</th>
                                    <th>Тип</th>
                                    <th>Scheduling</th>
                                    <th>Bound</th>
                                    <th>CPU</th>
                                    <th>Memory</th>
                                    <th>Concurrency</th>
                                    <th>Retry</th>
                                    <th>Обновлено</th>
                                </tr>
                                </thead>

                                <tbody>
                                {items.map((config) => (
                                    <tr
                                        key={config.id}
                                        className="projectsRowLink"
                                        onClick={() => navigate(`/projects/${projectId}/configs/${config.id}`)}>
                                        <td>{config.name ?? "—"}</td>
                                        <td>{getConfigType(config)}</td>
                                        <td>{getSchedulingMode(config)}</td>
                                        <td>{getWorkerBound(config)}</td>
                                        <td>{getCpu(config)}</td>
                                        <td>{getMemory(config)}</td>
                                        <td>{getConcurrency(config)}</td>
                                        <td>{getMaxAttempts(config)}</td>
                                        <td>{formatDateTime(config.updated_at ?? config.created_at)}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="projectsFooter">
                        <div className="projectsPills">
                            <span className="pill">Стр. {page} / {totalPages}</span>
                            <span className="pill">На странице: {pageSize}</span>
                        </div>

                        <div className="projectsActions">
                            <button
                                className="projectsBtn projectsBtnSecondary"
                                onClick={() => updateParam("page", Math.max(1, page - 1))}
                                disabled={page <= 1 || isFetching}
                                type="button">
                                Назад
                            </button>

                            <button
                                className="projectsBtn projectsBtnSecondary"
                                onClick={() => updateParam("page", Math.min(totalPages, page + 1))}
                                disabled={page >= totalPages || isFetching}
                                type="button">
                                Вперёд
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </section>
    )
}