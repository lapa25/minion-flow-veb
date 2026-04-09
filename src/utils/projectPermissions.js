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
        canManageTasks: true
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
        canManageTasks: true
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
        canManageTasks: true
    }
}

export function getProjectPermissions(role) {
    return {
        ...PROJECT_PERMISSIONS[role],
    }
}