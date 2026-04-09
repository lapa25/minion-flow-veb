import {apiSlice} from "../../api/apiSlice.js"

export const tasksApiSlice = apiSlice.injectEndpoints({
    endpoints: (build) => ({
        getProjectTasks: build.query({
            query: ({projectId, page = 0, size = 20}) => ({
                url: `/artifact-service/api/projects/${projectId}/tasks`,
                params: {page, size},
            }),
            providesTags: (result, _err, arg) => [
                { type: "ProjectTasks", id: `LIST:${arg.projectId}` },
                ...((result?.records ?? []).map((task) => ({
                    type: "ProjectTask",
                    id: task.taskId,
                }))),
            ],
        }),

        getProjectTask: build.query({
            query: ({projectId, taskId}) => ({
                url: `/artifact-service/api/projects/${projectId}/tasks/${taskId}`,
            }),
            providesTags: (_result, _err, arg) => [
                { type: "ProjectTask", id: arg.taskId },
            ],
        }),

        createProjectTask: build.mutation({
            query: ({projectId, ...body}) => ({
                url: `/artifact-service/api/projects/${projectId}/tasks`, method: "POST", body}),
            invalidatesTags: (_result, _err, arg) => [
                { type: "ProjectTasks", id: `LIST:${arg.projectId}` },
            ],
        }),

        cancelProjectTask: build.mutation({
            query: ({projectId, taskId}) => ({
                url: `/artifact-service/api/projects/${projectId}/tasks/${taskId}`, method: "PATCH"}),
            invalidatesTags: (_result, _err, arg) => [
                { type: "ProjectTasks", id: `LIST:${arg.projectId}` },
                { type: "ProjectTask", id: arg.taskId },
            ],
        }),

        getProjectTaskOutputs: build.query({
            query: ({projectId, taskId}) => ({
                url: `/artifact-service/api/projects/${projectId}/tasks/${taskId}/outputs`,
            }),
        }),
    }),
})

export const {
    useGetProjectTasksQuery,
    useLazyGetProjectTasksQuery,
    useGetProjectTaskQuery,
    useCreateProjectTaskMutation,
    useCancelProjectTaskMutation,
    useGetProjectTaskOutputsQuery,
} = tasksApiSlice