import {Link, useNavigate, useParams} from "react-router-dom"
import {useForm} from "react-hook-form"
import {zodResolver} from "@hookform/resolvers/zod"
import {ErrorBanner} from "../components/ui/ErrorBanner.jsx"
import {InlineLoader} from "../components/ui/InlineLoader.jsx"
import {getApiErrorMessage} from "../utils/getApiErrorMessage.js"
import {useDeleteProjectMutation, useGetProjectQuery,
    useInviteProjectMemberMutation, useRemoveProjectMemberMutation, useUpdateProjectMemberMutation
} from "../store/projects/projectsApiSlice.js"
import "../styles/ProjectsPages.css"
import {formatDateTime} from "../utils/datetime.js"
import {inviteSchema} from "../validation/projectSchemas.js"
import {MANAGE_ROLE, PROJECT_ROLE} from "../utils/projectRole.js"
import {QueryBoundary} from "../components/guards/QueryBoundary.jsx"
import {ProjectPermissionsBoundary} from "../components/guards/ProjectPermissionsBoundary.jsx"
import {PageHeader} from "../components/layout/PageHeader.jsx"
import {RefreshButton} from "../components/ui/RefreshButton.jsx"
import {PageCard} from "../components/layout/PageCard.jsx"
import {getProjectFieldClass} from "../utils/getProjectFieldClass.js"

export const ProjectPage = () => {
    const { projectId } = useParams()
    const navigate = useNavigate()

    const {data: project, isFetching, isError, error, refetch} =
        useGetProjectQuery(projectId, { refetchOnMountOrArgChange: true })

    const [deleteProject, { isLoading: isDeleting, isError: delErrorFlag, error: delError }] =
        useDeleteProjectMutation()

    const [inviteMember, { isLoading: inviteLoading, isError: inviteIsError, error: inviteError }] =
        useInviteProjectMemberMutation()

    const [updateMember, { isLoading: updateMemberLoading }] = useUpdateProjectMemberMutation()
    const [removeMember, { isLoading: removeMemberLoading }] = useRemoveProjectMemberMutation()

    const inviteForm = useForm({
        resolver: zodResolver(inviteSchema),
        mode: "onChange",
        defaultValues: {
            username: "",
            memberRole: "USER",
        },
    })

    const onDelete = async (permissions) => {
        if (!permissions?.canManageProject) {
            return
        }
        if (!window.confirm("Удалить проект? Действие необратимо")) {
            return
        }
        await deleteProject(projectId).unwrap()
        navigate("/projects")
    }

    return (
        <QueryBoundary
            isLoading={isFetching}
            hasData={!!project}
            isError={isError}
            error={error}
            onRetry={refetch}
            loadingLabel="Загружаем проект..."
            errorTitle="Не удалось загрузить проект"
            errorMessage={getApiErrorMessage(error)}
        >
            <ProjectPermissionsBoundary projectId={projectId}>
                {({members, projectRole, permissions, isLoadingMembers, reloadMembers}) => {
                    const onInvite = async (values) => {
                        if (!permissions?.canManageMembers) {
                            return
                        }
                        await inviteMember({
                            projectId,
                            username: values.username.trim(),
                            memberRole: values.memberRole,
                        }).unwrap()
                        inviteForm.reset({
                                username: "",
                                memberRole: values.memberRole,
                        })
                        await reloadMembers()
                    }
                    const onChangeRole = async (userId, memberRole) => {
                        if (!permissions?.canManageMembers) {
                            return
                        }
                        await updateMember({ projectId, userId, memberRole }).unwrap()
                        await reloadMembers()
                    }
                    const onRemove = async (userId, memberRole) => {
                        if (!permissions?.canManageMembers || memberRole === "OWNER") {
                            return
                        }
                        if (!window.confirm("Удалить участника из проекта?")) {
                            return
                        }
                        await removeMember({ projectId, userId }).unwrap()
                        await reloadMembers()
                    }
                    return (
                        <section className="projectsPage">
                            <PageHeader
                                title="Проект"
                                backTo="/projects"
                                backLabel="Назад к проектам"
                                actions={
                                    <>
                                        <RefreshButton
                                            onClick={refetch}
                                            isLoading={isFetching}
                                        />
                                        {permissions?.canManageProject ? (
                                            <Link className="projectsBtn" to={`/projects/${projectId}/edit`}>
                                                Редактировать
                                            </Link>
                                        ) : null}
                                        {permissions?.canManageProject ? (
                                            <button
                                                className="projectsBtn"
                                                onClick={() => onDelete(permissions)}
                                                disabled={isDeleting}
                                                type="button"
                                            >
                                                {isDeleting ? <InlineLoader label="Удаляем..." /> : "Удалить"}
                                            </button>
                                        ) : null}
                                    </>
                                }
                            />
                            {delErrorFlag ? (
                                <ErrorBanner
                                    title="Не удалось удалить проект"
                                    message={getApiErrorMessage(delError)}
                                />
                            ) : null}
                            <PageCard>
                                <h3>{project?.projectName ?? "—"}</h3>

                                <div className="projectsPills">
                                    <span className="pill">Моя роль: {PROJECT_ROLE[projectRole]}</span>
                                    <span className="pill">Project ID: {project?.projectId ?? "—"}</span>
                                </div>

                                <p className="projectsHint">
                                    {project?.projectDescription
                                        ? project.projectDescription
                                        : "Описание не задано"}
                                </p>
                            </PageCard>
                            <PageCard title="Разделы проекта">
                                <div className="projectsActions">
                                    {permissions?.canViewArtifacts ? (
                                        <Link className="projectsBtn projectsBtnSecondary" to={`/projects/${projectId}/artifacts`}>
                                            Артефакты
                                        </Link>
                                    ) : null}

                                    {permissions?.canViewInputs ? (
                                        <Link className="projectsBtn projectsBtnSecondary" to={`/projects/${projectId}/inputs`}>
                                            Входные данные
                                        </Link>
                                    ) : null}

                                    {permissions?.canViewConfigs ? (
                                        <Link className="projectsBtn projectsBtnSecondary" to={`/projects/${projectId}/configs`}>
                                            Конфигурации
                                        </Link>
                                    ) : null}

                                    {permissions?.canViewTasks ? (
                                        <Link className="projectsBtn projectsBtnSecondary" to={`/projects/${projectId}/tasks`}>
                                            Запуски
                                        </Link>
                                    ) : null}
                                </div>
                            </PageCard>
                            <PageCard
                                title="Участники"
                                actions={isLoadingMembers ? <InlineLoader label="Обновляем..." /> : null}
                            >
                                {members.length ? (
                                    <div className="projectsTableWrap">
                                        <table className="projectsTable">
                                            <thead>
                                            <tr>
                                                <th>Username</th>
                                                <th>Роль</th>
                                                <th>Добавлен</th>
                                                <th></th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {members.map((member) => {
                                                const isOwnerMember = member.memberRole === "OWNER"
                                                return (
                                                    <tr key={`${member.projectId}:${member.userId}`}>
                                                        <td>{member.username ?? "—"}</td>
                                                        <td>
                                                            {permissions?.canManageMembers && !isOwnerMember ? (
                                                                <select
                                                                    className="projectsSelect"
                                                                    value={member.memberRole}
                                                                    disabled={updateMemberLoading}
                                                                    onChange={(e) =>
                                                                        onChangeRole(member.userId, e.target.value)
                                                                    }
                                                                >
                                                                    {MANAGE_ROLE.map((r) => (
                                                                        <option key={r} value={r}>
                                                                            {PROJECT_ROLE[r.toLowerCase()]}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            ) : (
                                                                <span className="pill">
                                                                    {PROJECT_ROLE[member.memberRole?.toLowerCase()] ??
                                                                        member.memberRole}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td>{formatDateTime(member.memberSince)}</td>
                                                        <td>
                                                            {!isOwnerMember && permissions?.canManageMembers ? (
                                                                <button
                                                                    className="projectsBtn projectsBtnDelete"
                                                                    disabled={removeMemberLoading}
                                                                    onClick={() => onRemove(member.userId,
                                                                        member.memberRole)}
                                                                    type="button"
                                                                >
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
                                    <ErrorBanner
                                        title="Не удалось добавить"
                                        message={getApiErrorMessage(inviteError)}
                                    />
                                ) : null}

                                {permissions?.canManageMembers ? (
                                    <form className="projectsForm" onSubmit={inviteForm.handleSubmit(onInvite)}>
                                        <h4>Добавить участника</h4>
                                        <div className="projectsTwoCols">
                                            <div className="projectsFormRow">
                                                <label>Username</label>
                                                <input
                                                    className={getProjectFieldClass(inviteForm,
                                                        "username", "projectsInput")}
                                                    placeholder="username"
                                                    disabled={inviteLoading}
                                                    {...inviteForm.register("username")}
                                                />
                                                <p className={inviteForm.formState.errors.username ?
                                                    "instructions instructionsError" : ""}>
                                                    {inviteForm.formState.errors.username?.message}
                                                </p>
                                            </div>

                                            <div className="projectsFormRow">
                                                <label>Роль</label>
                                                <select
                                                    className={getProjectFieldClass(inviteForm,
                                                        "memberRole", "projectsSelect")}
                                                    disabled={inviteLoading}
                                                    {...inviteForm.register("memberRole")}
                                                >
                                                    {MANAGE_ROLE.map((r) => (
                                                        <option key={r} value={r}>
                                                            {PROJECT_ROLE[r.toLowerCase()]}
                                                        </option>
                                                    ))}
                                                </select>
                                                <p className={inviteForm.formState.errors.memberRole ?
                                                    "instructions instructionsError" : ""}>
                                                    {inviteForm.formState.errors.memberRole?.message}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="projectsActions">
                                            <button
                                                className="projectsBtn"
                                                type="submit"
                                                disabled={!inviteForm.formState.isValid || inviteLoading}
                                            >
                                                {inviteLoading ? <InlineLoader label="Добавляем..." /> : "Добавить"}
                                            </button>
                                        </div>
                                    </form>
                                ) : null}
                            </PageCard>
                        </section>
                    )
                }}
            </ProjectPermissionsBoundary>
        </QueryBoundary>
    )
}