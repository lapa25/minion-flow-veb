import {useEffect, useMemo, useRef, useState} from "react"
import {Link, useNavigate, useSearchParams} from "react-router-dom"

import {ErrorBanner} from "../components/ui/ErrorBanner.jsx"
import {InlineLoader} from "../components/ui/InlineLoader.jsx"
import {getApiErrorMessage} from "../utils/getApiErrorMessage.js"
import {useGetProjectsQuery} from "../store/projects/projectsApiSlice.js"
import {formatDateTime} from "../utils/datetime.js"

import "./ProjectsPages.css"
import {PROJECT_ROLE} from "../utils/projectRole.js";

const asInt = (v, fallback) => {
    const n = parseInt(String(v ?? ""), 10)
    return Number.isFinite(n) && n > 0 ? n : fallback
}

export const ProjectsPage = () => {
    const navigate = useNavigate()
    const [sp, setSp] = useSearchParams()

    const q = sp.get("q") ?? ""
    const status = sp.get("status") ?? "all"
    const sort = sp.get("sort") ?? "created_desc"
    const page = asInt(sp.get("page"), 1)
    const pageSize = asInt(sp.get("pageSize"), 10)

    const queryArgs = useMemo(
        () => ({q: q || undefined, status, sort, page, pageSize}),
        [q, status, sort, page, pageSize]
    )

    const { data, isFetching, isError, error, refetch } = useGetProjectsQuery(queryArgs, {
        refetchOnMountOrArgChange: true,
    })

    const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []
    const total = typeof data?.total === "number" ? data.total : items.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))

    const [search, setSearch] = useState(q)

    const spRef = useRef(sp)
    useEffect(() => {
        spRef.current = sp
    }, [sp])

    useEffect(() => {
        setSearch(q)
    }, [q])

    useEffect(() => {
        if (search === q) {
            return
        }
        const t = setTimeout(() => {
            const next = new URLSearchParams(spRef.current)
            const v = search.trim()
            if (v) {
                next.set("q", v)
            }
            else {
                next.delete("q")
            }
            next.set("page", "1")
            setSp(next, { replace: true })
        }, 350)
        return () => clearTimeout(t)
    }, [search, q, setSp])

    const updateParam = (key, value) => {
        const next = new URLSearchParams(sp)
        if (value === undefined || value === null || value === "") {
            next.delete(key)
        }
        else {
            next.set(key, String(value))
        }
        if (key !== "page") {
            next.set("page", "1")
        }
        setSp(next, { replace: true })
    }

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
                    <input
                        className="projectsInput"
                        type="text"
                        placeholder="Поиск по названию"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}/>

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
                            type="button"> Назад
                        </button>
                        <button
                            className="projectsBtn projectsBtnSecondary"
                            onClick={() => updateParam("page", Math.min(totalPages, page + 1))}
                            disabled={page >= totalPages || isFetching}
                            type="button"> Вперёд
                        </button>
                    </div>
                </div>
            </div>
        </section>
    )
}