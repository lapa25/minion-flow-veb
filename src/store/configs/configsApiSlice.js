import {apiSlice} from "../../api/apiSlice.js"

export const configsApiSlice = apiSlice.injectEndpoints({
    endpoints: (build) => ({
        getProjectConfigs: build.query({
            query: ({ projectId, ...params }) => ({
                url: `/projects/${projectId}/configs`,
                params
            }),
            providesTags: (result, _err, arg) => {
                const items = Array.isArray(result)
                    ? result : Array.isArray(result?.items)
                        ? result.items : []

                return [
                    { type: "ProjectConfigs", id: `LIST:${arg.projectId}` },
                    ...items
                        .filter((item) => item?.id)
                        .map((item) => ({ type: "ProjectConfig", id: item.id }))
                ]
            },
        }),

        getProjectConfig: build.query({
            query: ({ projectId, configId }) => ({
                url: `/projects/${projectId}/configs/${configId}`,
            }),
            providesTags: (_result, _err, arg) => [
                { type: "ProjectConfig", id: arg.configId }
            ],
        }),

        createProjectConfig: build.mutation({
            query: ({ projectId, ...body }) => ({
                url: `/projects/${projectId}/configs`,
                method: "POST",
                body
            }),
            invalidatesTags: (_result, _err, arg) => [
                { type: "ProjectConfigs", id: `LIST:${arg.projectId}` }
            ],
        }),

        updateProjectConfig: build.mutation({
            query: ({ projectId, configId, ...body }) => ({
                url: `/projects/${projectId}/configs/${configId}`,
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
                url: `/projects/${projectId}/configs/${configId}`,
                method: "DELETE"
            }),
            invalidatesTags: (_result, _err, arg) => [
                { type: "ProjectConfigs", id: `LIST:${arg.projectId}` },
                { type: "ProjectConfig", id: arg.configId }
            ],
        }),

        exportProjectConfig: build.mutation({
            query: ({ projectId, configId }) => ({
                url: `/projects/${projectId}/configs/${configId}/export`,
                responseHandler: async (response) => response.blob()
            }),
        }),
    }),
})

export const {
    useGetProjectConfigsQuery,
    useGetProjectConfigQuery,
    useCreateProjectConfigMutation,
    useUpdateProjectConfigMutation,
    useDeleteProjectConfigMutation,
    useExportProjectConfigMutation,
} = configsApiSlice
