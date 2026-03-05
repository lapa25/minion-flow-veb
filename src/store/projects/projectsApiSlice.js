import { apiSlice } from "../../api/apiSlice.js"

export const projectsApiSlice = apiSlice.injectEndpoints({
    endpoints: (build) => ({
        getProjects: build.query({
            query: (params = {}) => ({
                url: "/projects", params}),
            providesTags: (result) => {
                const items = Array.isArray(result)
                    ? result : Array.isArray(result?.items)
                        ? result.items : []
                return [
                    { type: "Projects", id: "LIST" },
                    ...items
                        .filter((p) => p?.id)
                        .map((p) => ({ type: "Project", id: p.id }))
                ]
            },
        }),
        getProject: build.query({
            query: (projectId) => ({
                url: `/projects/${projectId}`,
            }),
            providesTags: (_result, _err, projectId) => [
                { type: "Project", id: projectId }
            ],
        }),
        createProject: build.mutation({
            query: (body) => ({
                url: "/projects", method: "POST", body}),
            invalidatesTags: [{ type: "Projects", id: "LIST" }],
        }),
        updateProject: build.mutation({
            query: ({ projectId, ...body }) => ({
                url: `/projects/${projectId}`, method: "PATCH", body}),
            invalidatesTags: (_result, _err, arg) => [
                { type: "Projects", id: "LIST" },
                { type: "Project", id: arg.projectId },
            ],
        }),
        deleteProject: build.mutation({
            query: (projectId) => ({
                url: `/projects/${projectId}`, method: "DELETE"}),
            invalidatesTags: (_result, _err, projectId) => [
                { type: "Projects", id: "LIST" },
                { type: "Project", id: projectId },
            ],
        }),
        getProjectMembers: build.query({
            query: (projectId) => ({
                url: `/projects/${projectId}/members`}),
            providesTags: (result, _err, projectId) => {
                const items = Array.isArray(result)
                    ? result : Array.isArray(result?.items)
                        ? result.items : []
                return [
                    { type: "ProjectMembers", id: `LIST:${projectId}` },
                    ...items
                        .filter((m) => m?.id)
                        .map((m) => ({ type: "ProjectMembers", id: m.id })),
                ]
            },
        }),
        inviteProjectMember: build.mutation({
            query: ({ projectId, ...body }) => ({
                url: `/projects/${projectId}/members/invite`, method: "POST", body}),
            invalidatesTags: (_result, _err, arg) => [
                { type: "ProjectMembers", id: `LIST:${arg.projectId}` },
            ],
        }),
        updateProjectMember: build.mutation({
            query: ({ projectId, memberId, ...body }) => ({
                url: `/projects/${projectId}/members/${memberId}`, method: "PATCH", body}),
            invalidatesTags: (_result, _err, arg) => [
                { type: "ProjectMembers", id: `LIST:${arg.projectId}` },
                { type: "ProjectMembers", id: arg.memberId },
            ],
        }),
        removeProjectMember: build.mutation({
            query: ({ projectId, memberId }) => ({
                url: `/projects/${projectId}/members/${memberId}`, method: "DELETE"}),
            invalidatesTags: (_result, _err, arg) => [
                { type: "ProjectMembers", id: `LIST:${arg.projectId}` },
            ],
        }),
    }),
});

export const {
    useGetProjectsQuery, useGetProjectQuery, useCreateProjectMutation,
    useUpdateProjectMutation, useDeleteProjectMutation, useGetProjectMembersQuery,
    useInviteProjectMemberMutation, useUpdateProjectMemberMutation, useRemoveProjectMemberMutation}
    = projectsApiSlice;