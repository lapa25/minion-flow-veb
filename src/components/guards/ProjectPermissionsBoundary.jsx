import {Navigate} from "react-router-dom"
import {ErrorBanner} from "../ui/ErrorBanner.jsx"
import {InlineLoader} from "../ui/InlineLoader.jsx"
import {getApiErrorMessage} from "../../utils/getApiErrorMessage.js"
import {useProjectPermissions} from "../../hooks/useProjectPermissions.js"
import {PageCard} from "../layout/PageCard.jsx"

export const ProjectPermissionsBoundary = ({projectId, permission, redirectTo,
    deniedTitle = "Недостаточно прав", deniedMessage = "У вас нет доступа к этому разделу", children}) => {
    const permissionsState = useProjectPermissions(projectId)
    const {members, projectRole, permissions, isLoadingMembers, membersError,
        isResolved, reloadMembers} = permissionsState
    if (membersError) {
        return (
            <PageCard as="section">
                <ErrorBanner
                    title="Не удалось определить права"
                    message={getApiErrorMessage(
                        membersError,
                        "Ошибка загрузки участников проекта"
                    )}
                />
            </PageCard>
        )
    }
    if (!isResolved || isLoadingMembers) {
        return (
            <PageCard as="section">
                <InlineLoader label="Проверяем права..." />
            </PageCard>
        )
    }
    if (permission && !permissions?.[permission]) {
        if (redirectTo) {
            return <Navigate to={redirectTo} replace />
        }
        return (
            <PageCard as="section">
                <ErrorBanner
                    title={deniedTitle}
                    message={deniedMessage}
                />
            </PageCard>
        )
    }
    return children({members, projectRole, permissions, isLoadingMembers, isResolved, reloadMembers})
}