import { apiSlice } from "../../api/apiSlice.js"

export const projectsApiSlice = apiSlice.injectEndpoints({
    endpoints: (build) => ({
        getProjects: build.query({
            query: ({page = 0, size = 20} = {}) => ({
                url: "/project-service/projects",
                params: {page, size}
            }),
            providesTags: (result) => [
                { type: "Projects", id: "LIST" },
                ...((result?.records ?? []).map((project) => ({
                    type: "Project",
                    id: project.projectId,
                }))),
            ]
        }),
        getProject: build.query({
            query: (projectId) => ({
                url: `/project-service/projects/${projectId}`,
            }),
            providesTags: (_result, _err, projectId) => [
                { type: "Project", id: projectId }
            ],
        }),
        createProject: build.mutation({
            query: (body) => ({
                url: "/project-service/projects", method: "POST", body}),
            invalidatesTags: [{ type: "Projects", id: "LIST" }],
        }),
        updateProject: build.mutation({
            query: ({ projectId, ...body }) => ({
                url: `/project-service/projects/${projectId}`, method: "PATCH", body}),
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
            query: ({projectId, page = 0, size = 20}) => ({
                url: `/project-service/projects/${projectId}/members`,
                params: {page, size},
            }),
            providesTags: (result, _err, arg) => [
                { type: "ProjectMembers", id: `LIST:${arg.projectId}` },
                ...((result?.records ?? []).map((member) => ({
                    type: "ProjectMembers",
                    id: `${member.projectId}:${member.userId}`,
                }))),
            ],
        }),
        inviteProjectMember: build.mutation({
            query: ({ projectId, ...body }) => ({
                url: `/project-service/projects/${projectId}/members`, method: "POST", body}),
            invalidatesTags: (_result, _err, arg) => [
                { type: "ProjectMembers", id: `LIST:${arg.projectId}` },
            ],
        }),
        updateProjectMember: build.mutation({
            query: ({ projectId, userId, ...body }) => ({
                url: `/project-service/projects/${projectId}/members/${userId}`, method: "PATCH",
                body}),
            invalidatesTags: (_result, _err, arg) => [
                { type: "ProjectMembers", id: `LIST:${arg.projectId}` },
                { type: "ProjectMembers", id: arg.userId },
            ],
        }),
        removeProjectMember: build.mutation({
            query: ({ projectId, userId }) => ({
                url: `/project-service/projects/${projectId}/members/${userId}`, method: "DELETE"}),
            invalidatesTags: (_result, _err, arg) => [
                { type: "ProjectMembers", id: `LIST:${arg.projectId}` },
                { type: "ProjectMembers", id: arg.userId },
            ],
        }),
    }),
});

export const {useGetProjectsQuery, useLazyGetProjectsQuery, useGetProjectQuery, useCreateProjectMutation,
    useUpdateProjectMutation, useDeleteProjectMutation, useGetProjectMembersQuery,
    useLazyGetProjectMembersQuery, useInviteProjectMemberMutation, useUpdateProjectMemberMutation,
    useRemoveProjectMemberMutation} = projectsApiSlice;