import {apiSlice} from "../../api/apiSlice.js"

export const inputsApiSlice = apiSlice.injectEndpoints({
    endpoints: (build) => ({
        getProjectInputs: build.query({
            query: ({projectId, page = 0, size = 20}) => ({
                url: `/artifact-service/api/projects/${projectId}/inputs`,
                params: {page, size}
            }),
            providesTags: (result, _err, arg) => [
                {type: "ProjectInputs", id: `LIST:${arg.projectId}`},
                ...((result?.records ?? [])
                    .map((item) => item?.artifact?.artifactId)
                    .filter(Boolean)
                    .map((artifactId) => ({
                        type: "ProjectInput",
                        id: artifactId
                    })))
            ]
        }),

        getProjectInput: build.query({
            query: ({projectId, artifactId}) => ({
                url: `/artifact-service/api/projects/${projectId}/inputs/${artifactId}`
            }),
            providesTags: (_result, _err, arg) => [
                {type: "ProjectInput", id: arg.artifactId}
            ]
        }),

        createProjectInput: build.mutation({
            query: ({projectId, alias, inputType, file}) => {
                const formData = new FormData()
                formData.append("alias", alias)
                formData.append("inputType", inputType)
                formData.append("file", file)

                return {url: `/artifact-service/api/projects/${projectId}/inputs`,
                    method: "POST", body: formData}
            },
            invalidatesTags: (_result, _err, arg) => [
                {type: "ProjectInputs", id: `LIST:${arg.projectId}`}
            ]
        }),

        updateProjectInputMeta: build.mutation({
            query: ({projectId, artifactId, alias, inputType}) => ({
                url: `/artifact-service/api/projects/${projectId}/inputs/${artifactId}`,
                method: "PATCH",
                body: {alias, inputType}
            }),
            invalidatesTags: (_result, _err, arg) => [
                {type: "ProjectInputs", id: `LIST:${arg.projectId}`},
                {type: "ProjectInput", id: arg.artifactId}
            ]
        }),

        updateProjectInputContent: build.mutation({
            query: ({projectId, artifactId, file}) => {
                const formData = new FormData()
                formData.append("file", file)

                return {url: `/artifact-service/api/projects/${projectId}/inputs/${artifactId}/content`,
                    method: "PUT", body: formData}
            },
            invalidatesTags: (_result, _err, arg) => [
                {type: "ProjectInputs", id: `LIST:${arg.projectId}`},
                {type: "ProjectInput", id: arg.artifactId}
            ]
        }),

        deleteProjectInput: build.mutation({
            query: ({projectId, artifactId}) => ({
                url: `/artifact-service/api/projects/${projectId}/inputs/${artifactId}`,
                method: "DELETE"
            }),
            invalidatesTags: (_result, _err, arg) => [
                {type: "ProjectInputs", id: `LIST:${arg.projectId}`},
                {type: "ProjectInput", id: arg.artifactId}
            ]
        }),

        getProjectInputContent: build.query({
            query: ({projectId, artifactId}) => ({
                url: `/artifact-service/api/projects/${projectId}/inputs/${artifactId}/content`,
                responseHandler: async (response) => response.blob(),
                cache: "no-cache"
            })
        })
    })
})

export const {useGetProjectInputsQuery, useLazyGetProjectInputsQuery, useGetProjectInputQuery,
    useCreateProjectInputMutation, useUpdateProjectInputMetaMutation, useUpdateProjectInputContentMutation,
    useDeleteProjectInputMutation, useLazyGetProjectInputContentQuery} = inputsApiSlice