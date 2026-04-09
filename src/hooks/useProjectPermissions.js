import {useCallback, useEffect, useMemo, useState} from "react"
import {useSelector} from "react-redux"
import {selectCurrentUser} from "../store/auth/authSelectors.js"
import {useLazyGetProjectMembersQuery} from "../store/projects/projectsApiSlice.js"
import {getProjectPermissions} from "../utils/projectPermissions.js"
import {getProjectRole} from "../utils/projectRole.js"

export const useProjectPermissions = (projectId) => {
    const currentUser = useSelector(selectCurrentUser)
    const [triggerGetProjectMembers] = useLazyGetProjectMembersQuery()

    const [members, setMembers] = useState([])
    const [isLoadingMembers, setIsLoadingMembers] = useState(Boolean(projectId))
    const [membersError, setMembersError] = useState(null)
    const [isResolved, setIsResolved] = useState(false)

    const loadAllMembers = useCallback(async () => {
        if (!projectId || !currentUser?.userId) {
            setMembers([])
            setMembersError(null)
            setIsLoadingMembers(false)
            setIsResolved(false)
            return
        }
        setIsLoadingMembers(true)
        setMembersError(null)
        setIsResolved(false)
        try {
            const firstPage = await triggerGetProjectMembers({projectId,
                page: 0, size: 100}).unwrap()

            const totalPages = firstPage?.pageCount ?? 1
            let allMembers = [...(firstPage?.records ?? [])]

            for (let page = 1; page < totalPages; ++page) {
                const pageData = await triggerGetProjectMembers({projectId,
                    page, size: 100}).unwrap()
                allMembers = [...allMembers, ...(pageData?.records ?? [])]
            }
            setMembers(allMembers)
            setIsResolved(true)
        } catch (error) {
            setMembersError(error)
            setIsResolved(true)
        } finally {
            setIsLoadingMembers(false)
        }
    }, [projectId, currentUser?.userId, triggerGetProjectMembers])

    useEffect(() => {
        loadAllMembers()
    }, [loadAllMembers])

    const projectRole = useMemo(() => {
        if (!isResolved) {
            return null
        }
        return getProjectRole(members, currentUser?.userId)
    }, [isResolved, members, currentUser?.userId])

    const permissions = useMemo(() => {
        if (!isResolved || !projectRole) {
            return null
        }
        return getProjectPermissions(projectRole)
    }, [isResolved, projectRole])

    return {members, projectRole, permissions, isLoadingMembers, membersError,
        isResolved, reloadMembers: loadAllMembers}
}