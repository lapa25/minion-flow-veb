import {apiSlice} from "../../api/apiSlice.js"

export const configsApiSlice = apiSlice.injectEndpoints({
    endpoints: (build) => ({
        getProjectConfigs: build.query({
            query: ({projectId, page = 0, size = 20}) => ({
                url: `/artifact-service/api/projects/${projectId}/executionConfigs`,
                params: {page, size}
            }),
            providesTags: (result, _err, arg) => {
                const items = Array.isArray(result?.records) ? result.records : []

                return [
                    { type: "ProjectConfigs", id: `LIST:${arg.projectId}` },
                    ...items
                        .filter((item) => item?.configId)
                        .map((item) => ({ type: "ProjectConfig", id: item.configId }))
                ]
            },
        }),

        getProjectConfig: build.query({
            query: ({ projectId, configId }) => ({
                url: `/artifact-service/api/projects/${projectId}/executionConfigs/${configId}`,
            }),
            providesTags: (_result, _err, arg) => [
                { type: "ProjectConfig", id: arg.configId }
            ],
        }),

        createProjectConfig: build.mutation({
            query: ({ projectId, ...body }) => ({
                url: `/artifact-service/api/projects/${projectId}/executionConfigs`,
                method: "POST",
                body
            }),
            invalidatesTags: (_result, _err, arg) => [
                { type: "ProjectConfigs", id: `LIST:${arg.projectId}` }
            ],
        }),

        updateProjectConfig: build.mutation({
            query: ({ projectId, configId, ...body }) => ({
                url: `/artifact-service/api/projects/${projectId}/executionConfigs/${configId}`,
                method: "PATCH",
                body
            }),
            invalidatesTags: (_result, _err, arg) => [
                { type: "ProjectConfigs", id: `LIST:${arg.projectId}` },
                { type: "ProjectConfig", id: arg.configId }
            ],
        }),

        deleteProjectConfig: build.mutation({
            query: ({ projectId, configId }) => ({
                url: `/artifact-service/api/projects/${projectId}/executionConfigs/${configId}`,
                method: "DELETE"
            }),
            invalidatesTags: (_result, _err, arg) => [
                { type: "ProjectConfigs", id: `LIST:${arg.projectId}` },
                { type: "ProjectConfig", id: arg.configId }
            ],
        }),
    }),
})

export const {
    useGetProjectConfigsQuery,
    useLazyGetProjectConfigsQuery,
    useGetProjectConfigQuery,
    useLazyGetProjectConfigQuery,
    useCreateProjectConfigMutation,
    useUpdateProjectConfigMutation,
    useDeleteProjectConfigMutation,
} = configsApiSlice
