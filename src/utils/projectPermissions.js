import { normalizeProjectRole } from "./projectRole.js"

const PROJECT_PERMISSIONS = {
    owner: {
        canManageProject: true,
        canManageMembers: true,
        canViewConfigs: true,
        canManageConfigs: true,
        canExportConfigs: true,
        canViewArtifacts: true,
        canManageArtifacts: true,
        canDownloadArtifacts: true,
        canManageInputs: true,
        canManageRuns: true
    },

    maintainer: {
        canManageProject: false,
        canManageMembers: false,
        canViewConfigs: true,
        canManageConfigs: true,
        canExportConfigs: true,
        canViewArtifacts: true,
        canManageArtifacts: true,
        canDownloadArtifacts: true,
        canManageInputs: true,
        canManageRuns: true
    },

    user: {
        canManageProject: false,
        canManageMembers: false,
        canViewConfigs: true,
        canManageConfigs: false,
        canExportConfigs: false,
        canViewArtifacts: true,
        canManageArtifacts: false,
        canDownloadArtifacts: false,
        canManageInputs: true,
        canManageRuns: true
    }
}

export function getProjectPermissions(role) {
    const normalizedRole = normalizeProjectRole(role)
    return {
        ...PROJECT_PERMISSIONS[normalizedRole],
    }
}