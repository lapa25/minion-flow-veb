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
        canViewInputs: true,
        canManageInputs: true,
        canViewTasks: true,
        canManageTasks: true,
        canViewTaskOutputs: true,
        canViewTaskLogs: true,
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
        canViewInputs: true,
        canManageInputs: true,
        canViewTasks: true,
        canManageTasks: true,
        canViewTaskOutputs: true,
        canViewTaskLogs: true,
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
        canViewInputs: true,
        canManageInputs: true,
        canViewTasks: true,
        canManageTasks: true,
        canViewTaskOutputs: true,
        canViewTaskLogs: true,
    }
}

export function getProjectPermissions(role) {
    return {
        ...PROJECT_PERMISSIONS[role],
    }
}