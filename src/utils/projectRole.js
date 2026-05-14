export const PROJECT_ROLE = {
    owner: "Владелец",
    maintainer: "Мейнтейнер",
    user: "Пользователь",
}

export const MANAGE_ROLE = ["MAINTAINER", "USER"]

const BACKEND_ROLE_TO_UI = {
    OWNER: "owner",
    MAINTAINER: "maintainer",
    USER: "user",
}
export const getProjectRole = (members, currentUserId) => {
    const currentMember = (members ?? []).find((item) => item.userId === currentUserId)
    return fromBackendProjectRole(currentMember?.memberRole)
}

export const fromBackendProjectRole = (memberRole) =>
    BACKEND_ROLE_TO_UI[memberRole] ?? "none"