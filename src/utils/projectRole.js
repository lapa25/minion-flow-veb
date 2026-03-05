export const PROJECT_ROLE = {
    owner: "Владелец",
    maintainer: "Мейнтейнер",
    user: "Пользователь",
}

export const MANAGE_ROLE = ["maintainer", "user"]

export function normalizeProjectRole(role) {
    return Object.keys(PROJECT_ROLE).includes(role)
        ? role : "user"
}

export function getProjectRole(project, currentUser) {
    if (project?.current_user_role) {
        return normalizeProjectRole(project.current_user_role);
    }

    const currentEmail = String(currentUser?.email || "").trim().toLowerCase()
    const members = Array.isArray(project?.members) ? project.members : []
    const member = members.find(
        (item) => String(item?.email || "").trim().toLowerCase() === currentEmail,
    );

    return normalizeProjectRole(member?.role);
}