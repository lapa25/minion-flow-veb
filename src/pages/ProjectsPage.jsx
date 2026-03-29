import {useCallback, useMemo} from "react"
import {Link, useNavigate} from "react-router-dom"

import {ErrorBanner} from "../components/ui/ErrorBanner.jsx"
import {InlineLoader} from "../components/ui/InlineLoader.jsx"
import {getApiErrorMessage} from "../utils/getApiErrorMessage.js"
import {useGetProjectsQuery} from "../store/projects/projectsApiSlice.js"
import {formatDateTime} from "../utils/datetime.js"

import "./ProjectsPages.css"
import {PROJECT_ROLE} from "../utils/projectRole.js";
import {useListSearchParams} from "../utils/search.js";
import {DebouncedSearchInput} from "../components/ui/DebouncedSearchInput.jsx";

const PROJECTS_PAGE_DEFAULTS = {
    q: "",
    status: "all",
    sort: "created_desc",
    page: 1,
    pageSize: 10,
}

export const ProjectsPage = () => {
    const navigate = useNavigate()

    const {
        params: {q, status, sort, page, pageSize}, updateParam} =
        useListSearchParams(PROJECTS_PAGE_DEFAULTS)

    const queryArgs = useMemo(
        () => ({q: q || undefined, status: status !== "all" ? status : undefined,
            sort, page, pageSize}),
        [q, status, sort, page, pageSize]
    )

    const {data, isFetching, isError, error, refetch} = useGetProjectsQuery(queryArgs, {
        refetchOnMountOrArgChange: true,
    })

    const items = data?.items ?? []
    const total = data?.total ?? 0
    const totalPages = Math.max(1, Math.ceil(total / pageSize))

    const commitSearch = useCallback(
        (value) => updateParam("q", value),
        [updateParam]
    )

    return (
        <section className="projectsPage">
            <div className="projectsHeader">
                <div>
                    <h2>Проекты</h2>
                    <div className="projectsPills">
                        <span className="pill">Всего: {total}</span>
                        {isFetching ? <span className="pill">Обновляем…</span> : null}
                    </div>
                </div>

                <div className="projectsActions">
                    <button
                        className="projectsBtn projectsBtnSecondary"
                        onClick={() => refetch()}
                        disabled={isFetching}
                        type="button">
                        {isFetching ? <InlineLoader label="Обновляем..." /> : "Обновить"}
                    </button>
                    <Link className="projectsBtn" to="/projects/new">
                        Создать проект
                    </Link>
                </div>
            </div>

            {isError ? (
                <ErrorBanner
                    title="Не удалось загрузить проекты"
                    message={getApiErrorMessage(error)}
                    onRetry={() => refetch()}
                />
            ) : null}

            <div className="projectsCard">
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
                        value={status}
                        onChange={(e) => updateParam("status", e.target.value)}>
                        <option value="all">Все</option>
                        <option value="active">Активные</option>
                        <option value="inactive">Неактивные</option>
                    </select>

                    <select
                        className="projectsSelect"
                        value={sort}
                        onChange={(e) => updateParam("sort", e.target.value)}>
                        <option value="created_desc">Сначала новые</option>
                        <option value="created_asc">Сначала старые</option>
                        <option value="name_asc">Название A→Z</option>
                        <option value="name_desc">Название Z→A</option>
                    </select>
                </div>
            </div>

            <div className="projectsCard">
                <h3>Список</h3>

                {!isFetching && !items.length ? (
                    <p className="projectsHint">
                        Проектов нет - создайте первый проект
                    </p>
                ) : (
                    <div className="projectsTableWrap">
                        <table className="projectsTable">
                            <thead>
                            <tr>
                                <th>Название</th>
                                <th>Роль</th>
                                <th>Активен</th>
                                <th>Создан</th>
                            </tr>
                            </thead>
                            <tbody>
                            {items.map((p) => (
                                <tr
                                    key={p.id}
                                    className="projectsRowLink"
                                    onClick={() => navigate(`/projects/${p.id}`)}>
                                    <td>{p.name ?? "—"}</td>
                                    <td>{PROJECT_ROLE[p.current_user_role] ?? "Пользователь"}</td>
                                    <td>{p.is_active ? "Да" : "Нет"}</td>
                                    <td>{formatDateTime(p.created_at)}</td>
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
    )
}