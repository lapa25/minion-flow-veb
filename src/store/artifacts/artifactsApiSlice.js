import {apiSlice} from "../../api/apiSlice.js"

export const artifactsApiSlice = apiSlice.injectEndpoints({
    endpoints: (build) => ({
        getProjectArtifacts: build.query({
            query: ({projectId, page = 0, size = 20}) => ({
                url: `/artifact-service/api/projects/${projectId}/artifacts`,
                params: {page, size}
            }),
            providesTags: (result, _err, arg) => [
                {type: "ProjectArtifacts", id: `LIST:${arg.projectId}`},
                ...((result?.records ?? [])
                    .map((item) => item?.artifact?.artifactId)
                    .filter(Boolean)
                    .map((artifactId) => ({
                        type: "ProjectArtifact",
                        id: artifactId
                    })))
            ]
        }),

        getProjectArtifact: build.query({
            query: ({projectId, artifactId}) => ({
                url: `/artifact-service/api/projects/${projectId}/artifacts/${artifactId}`
            }),
            providesTags: (_result, _err, arg) => [
                {type: "ProjectArtifact", id: arg.artifactId}
            ]
        }),

        createProjectArtifact: build.mutation({
            query: ({projectId, alias, file}) => {
                const formData = new FormData()
                formData.append("alias", alias)
                formData.append("file", file)

                return {url: `/artifact-service/api/projects/${projectId}/artifacts`,
                    method: "POST", body: formData}
            },
            invalidatesTags: (_result, _err, arg) => [
                {type: "ProjectArtifacts", id: `LIST:${arg.projectId}`}
            ]
        }),

        updateProjectArtifactMeta: build.mutation({
            query: ({projectId, artifactId, alias}) => ({
                url: `/artifact-service/api/projects/${projectId}/artifacts/${artifactId}`,
                method: "PATCH", body: JSON.stringify({alias}),
                headers: {
                    "Content-Type": "application/json"
                }
            }),
            invalidatesTags: (_result, _err, arg) => [
                {type: "ProjectArtifacts", id: `LIST:${arg.projectId}`},
                {type: "ProjectArtifact", id: arg.artifactId}
            ]
        }),

        updateProjectArtifactContent: build.mutation({
            query: ({projectId, artifactId, file}) => {
                const formData = new FormData()
                formData.append("file", file)

                return {url: `/artifact-service/api/projects/${projectId}/artifacts/${artifactId}/content`,
                    method: "PUT", body: formData}
            },
            invalidatesTags: (_result, _err, arg) => [
                {type: "ProjectArtifacts", id: `LIST:${arg.projectId}`},
                {type: "ProjectArtifact", id: arg.artifactId}
            ]
        }),

        deleteProjectArtifact: build.mutation({
            query: ({projectId, artifactId}) => ({
                url: `/artifact-service/api/projects/${projectId}/artifacts/${artifactId}`,
                method: "DELETE"
            }),
            invalidatesTags: (_result, _err, arg) => [
                {type: "ProjectArtifacts", id: `LIST:${arg.projectId}`},
                {type: "ProjectArtifact", id: arg.artifactId}
            ]
        }),

        getProjectArtifactContent: build.query({
            query: ({projectId, artifactId}) => ({
                url: `/artifact-service/api/projects/${projectId}/artifacts/${artifactId}/content`,
                responseHandler: async (response) => response.blob(),
                cache: "no-cache"
            }),
        }),
    }),
})

export const {
    useGetProjectArtifactsQuery,
    useLazyGetProjectArtifactsQuery,
    useGetProjectArtifactQuery,
    useCreateProjectArtifactMutation,
    useUpdateProjectArtifactMetaMutation,
    useUpdateProjectArtifactContentMutation,
    useDeleteProjectArtifactMutation,
    useLazyGetProjectArtifactContentQuery,
} = artifactsApiSlice