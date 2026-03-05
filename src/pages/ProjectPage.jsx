import {Link, useNavigate, useParams} from "react-router-dom"
import {useSelector} from "react-redux"
import {useForm} from "react-hook-form"
import {zodResolver} from "@hookform/resolvers/zod"

import {ErrorBanner} from "../components/ui/ErrorBanner.jsx"
import {InlineLoader} from "../components/ui/InlineLoader.jsx"
import {getApiErrorMessage} from "../utils/getApiErrorMessage.js"
import {selectCurrentUser} from "../store/auth/authSelectors.js"

import {useDeleteProjectMutation, useGetProjectMembersQuery, useGetProjectQuery,
    useInviteProjectMemberMutation, useRemoveProjectMemberMutation, useUpdateProjectMemberMutation
} from "../store/projects/projectsApiSlice.js"

import "./ProjectsPages.css"
import {formatDateTime} from "../utils/datetime.js"
import {inviteSchema} from "../validation/projectSchemas.js"
import {getProjectRole, MANAGE_ROLE, PROJECT_ROLE} from "../utils/projectRole.js";

export const ProjectPage = () => {
    const { projectId } = useParams()
    const navigate = useNavigate()
    const currentUser = useSelector(selectCurrentUser)

    const {data: project, isFetching, isError, error, refetch} =
        useGetProjectQuery(projectId, { refetchOnMountOrArgChange: true })

    const [deleteProject, { isLoading: isDeleting, isError: delErrorFlag, error: delError }] =
        useDeleteProjectMutation()

    const {data: membersData, isFetching: isMembersFetching, isError: membersIsError,
        error: membersError, refetch: refetchMembers} =
        useGetProjectMembersQuery(projectId, { refetchOnMountOrArgChange: true })

    const members = Array.isArray(membersData)
        ? membersData : Array.isArray(membersData?.items)
            ? membersData.items : []

    const [inviteMember, { isLoading: inviteLoading, isError: inviteIsError, error: inviteError }] =
        useInviteProjectMemberMutation()
    const [updateMember, { isLoading: updateMemberLoading }] = useUpdateProjectMemberMutation()
    const [removeMember, { isLoading: removeMemberLoading }] = useRemoveProjectMemberMutation()

    const projectRole = getProjectRole(project, currentUser)
    const isOwner = projectRole === "owner"

    const inviteForm = useForm({
        resolver: zodResolver(inviteSchema),
        mode: "onChange",
        defaultValues: {
            email: "",
            role: "reader",
        },
    })

    const onDelete = async () => {
        if (!isOwner) {
            return
        }
        if (!window.confirm("Удалить проект? Действие необратимо")) {
            return
        }
        const res = await deleteProject(projectId)
        if ("data" in res) {
            navigate("/projects")
        }
    }

    const onInvite = async (values) => {
        if (!isOwner) {
            return
        }
        const res = await inviteMember({
            projectId,
            email: values.email.trim(),
            role: values.role,
        })

        if ("data" in res) {
            inviteForm.reset({ email: "", role: values.role })
            refetchMembers()
        }
    }

    const onChangeRole = async (memberId, role) => {
        if (!isOwner) {
            return
        }
        await updateMember({ projectId, memberId, role })
        refetchMembers()
    }

    const onRemove = async (memberId, role) => {
        if (!isOwner || role === "owner") {
            return
        }
        if (!window.confirm("Удалить участника из проекта?")) {
            return
        }
        await removeMember({ projectId, memberId })
        refetchMembers()
    }

    const limits = project?.limits || null

    return (
        <section className="projectsPage">
            <div className="projectsHeader">
                <div>
                    <h2>Проект</h2>
                    <p>
                        <Link to="/projects" className="line">← Назад к проектам</Link>
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

                    {isOwner ? (
                        <Link className="projectsBtn" to={`/projects/${projectId}/edit`}>
                            Редактировать
                        </Link>
                    ) : null}

                    {isOwner ? (
                        <button className="projectsBtn" onClick={onDelete} disabled={isDeleting} type="button">
                            {isDeleting ? <InlineLoader label="Удаляем..." /> : "Удалить"}
                        </button>
                    ) : null}
                </div>
            </div>

            {isError ? (
                <ErrorBanner
                    title="Не удалось загрузить проект"
                    message={getApiErrorMessage(error)}
                    onRetry={() => refetch()}
                />
            ) : null}

            {delErrorFlag ? (
                <ErrorBanner
                    title="Не удалось удалить проект"
                    message={getApiErrorMessage(delError)}
                />
            ) : null}

            <div className="projectsCard">
                <h3>{project?.name ?? "—"}</h3>

                <div className="projectsPills">
                    <span className={"pill " + (project?.is_active ? "" : "danger")}>
                      {project?.is_active ? "Активен" : "Неактивен"}
                    </span>
                    <span className="pill">Моя роль: {PROJECT_ROLE[projectRole]}</span>
                    <span className="pill">Создан: {formatDateTime(project?.created_at)}</span>
                </div>

                <p className="projectsHint">
                    {project?.description ? project.description : "Описание не задано"}
                </p>
            </div>
            <div className="projectsCard">
                <h3>Ограничения проекта</h3>
                {!limits ? (
                    <p className="projectsHint">Лимиты не заданы</p>
                ) : (
                    <div className="projectsTableWrap">
                        <table className="projectsTable">
                            <thead>
                            <tr>
                                <th>Параметр</th>
                                <th>Значение</th>
                            </tr>
                            </thead>
                            <tbody>
                            {Object.entries(limits).map(([k, v]) => (
                                <tr key={k}>
                                    <td>{k}</td>
                                    <td>{String(v)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="projectsCard">
                <div className="projectsHeader">
                    <h3>Участники</h3>
                    <div className="projectsActions">
                        <button
                            className="projectsBtn projectsBtnSecondary"
                            onClick={() => refetchMembers()}
                            disabled={isMembersFetching}
                            type="button">
                            {isMembersFetching ? <InlineLoader label="Обновляем..." /> : "Обновить"}
                        </button>
                    </div>
                </div>

                {membersIsError ? (
                    <ErrorBanner
                        title="Не удалось загрузить участников"
                        message={getApiErrorMessage(membersError)}
                        onRetry={() => refetchMembers()}
                    />
                ) : null}

                {members.length ? (
                    <div className="projectsTableWrap">
                        <table className="projectsTable">
                            <thead>
                            <tr>
                                <th>Email</th>
                                <th>Роль</th>
                                <th>Добавлен</th>
                                <th></th>
                            </tr>
                            </thead>
                            <tbody>
                            {members.map((m) => {
                                const role = m.role ?? "user"
                                const isOwnerMember = role === "owner"
                                return (
                                    <tr key={m.id}>
                                        <td>{m.email ?? "—"}</td>
                                        <td>
                                            {isOwner && !isOwnerMember ? (
                                                <select
                                                    className="projectsSelect"
                                                    value={role}
                                                    disabled={updateMemberLoading}
                                                    onChange={(e) => onChangeRole(m.id, e.target.value)}>
                                                    {MANAGE_ROLE.map((r) => (
                                                        <option className="pill" key={r} value={r}>
                                                            {PROJECT_ROLE[r]}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span className="pill">{PROJECT_ROLE[role] ?? role}</span>
                                            )}
                                        </td>
                                        <td>{formatDateTime(m.created_at)}</td>
                                        <td>
                                            {!isOwnerMember && isOwner ? (
                                                <button
                                                    className="projectsBtn projectsBtnDelete"
                                                    disabled={removeMemberLoading}
                                                    title="Удалить"
                                                    onClick={() => onRemove(m.id, role)}
                                                    type="button">
                                                    Удалить
                                                </button>
                                            ) : null}
                                        </td>
                                    </tr>
                                )
                            })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="projectsHint">Участников нет</p>
                )}

                {inviteIsError ? (
                    <div>
                        <ErrorBanner title="Не удалось пригласить" message={getApiErrorMessage(inviteError)} />
                    </div>
                ) : null}

                {isOwner ? (
                    <form className="projectsForm" onSubmit={inviteForm.handleSubmit(onInvite)}>
                        <h4>Пригласить участника</h4>

                        <div className="projectsTwoCols">
                            <div className="projectsFormRow">
                                <label>Email</label>
                                <input
                                    className={"projectsInput" + (inviteForm.formState.errors.email ? " inputInvalid" : "")}
                                    placeholder="user@example.com"
                                    disabled={inviteLoading}
                                    {...inviteForm.register("email")}
                                />
                                <p className={inviteForm.formState.errors.email ? "instructions instructionsError" : ""}>
                                    {inviteForm.formState.errors.email?.message}
                                </p>
                            </div>

                            <div className="projectsFormRow">
                                <label>Роль</label>
                                <select
                                    className={"projectsSelect" + (inviteForm.formState.errors.role ? " inputInvalid" : "")}
                                    disabled={inviteLoading}
                                    {...inviteForm.register("role")}>
                                    {MANAGE_ROLE.map((r) => (
                                        <option key={r} value={r}>
                                            {PROJECT_ROLE[r]}
                                        </option>
                                    ))}
                                </select>
                                <p className={inviteForm.formState.errors.role ? "instructions instructionsError" : ""}>
                                    {inviteForm.formState.errors.role?.message}
                                </p>
                            </div>
                        </div>

                        <div className="projectsActions">
                            <button
                                className="projectsBtn"
                                type="submit"
                                disabled={!inviteForm.formState.isValid || inviteLoading}>
                                {inviteLoading ? <InlineLoader label="Приглашаем..." /> : "Пригласить"}
                            </button>
                        </div>
                    </form>
                ): null}
            </div>

            <div className="projectsCard">
                <h3>Разделы проекта</h3>
                <div className="projectsActions">
                    <Link className="projectsBtn projectsBtnSecondary" to={`/projects/${projectId}/configs`}>
                        Конфигурации
                    </Link>
                    <Link className="projectsBtn projectsBtnSecondary" to={`/projects/${projectId}/runs`}>
                        Запуски
                    </Link>
                </div>
            </div>
        </section>
    )
}