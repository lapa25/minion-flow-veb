import {apiSlice} from "../../api/apiSlice.js"
import {setCredentials, logout} from "./authSlice"

export const authApiSlice = apiSlice.injectEndpoints({
    endpoints: (build) => ({
            registration: build.mutation({
                query: (body) => ({ url: "/auth/register", method: "POST", body })
            }),
            login: build.mutation({
                query: (body) => ({ url: "/auth/login", method: "POST", body }),
                async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
                    const { data } = await queryFulfilled
                    dispatch(setCredentials({ user: data.user, accessToken: data.accessToken }))
                },
            }),
                me: build.query({
                    query: () => ({ url: '/auth/me' }),
                    providesTags: ['Me'],
                    async onQueryStarted(_arg, { dispatch, queryFulfilled, getState }) {
                        try {
                            const { data } = await queryFulfilled
                            const user = data?.user ?? data

                            const accessToken = getState()?.auth?.accessToken ?? null
                            dispatch(setCredentials({ user, accessToken }))
                        } catch {
                            // ошибки в ui
                        }
                    },
                }),
            logout: build.mutation({
                query: () => ({ url: '/auth/logout', method: 'POST' }),
                async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
                    try {
                        await queryFulfilled
                    } finally {
                        dispatch(logout())
                        dispatch(apiSlice.util.resetApiState())
                    }
                },
        }),
    })
})

export const { useLoginMutation, useMeQuery, useLogoutMutation, useRegistrationMutation } = authApiSlice