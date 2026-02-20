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
                        const accessToken = getState()?.auth?.accessToken ?? null
                        dispatch(setCredentials({ user: data.user, accessToken }))
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
            forgotPassword: build.mutation({
                query: (body) => ({ url: "/auth/forgot-password", method: "POST", body }),
            }),
            confirmEmail: build.mutation({
                query: (body) => ({ url: "/auth/confirm-email", method: "POST", body }),
                invalidatesTags: ['Me'],
            }),
            resendConfirmEmail: build.mutation({
                query: (body) => ({ url: "/auth/resend-confirm-email", method: "POST", body }),
            }),
            updateNotifications: build.mutation({
                query: (body) => ({ url: "/auth/notifications", method: "PATCH", body }),
                invalidatesTags: ['Me'],
            }),
            changePassword: build.mutation({
                query: (body) => ({ url: "/auth/change-password", method: "POST", body }),
            }),
    })
})

export const { useLoginMutation, useMeQuery, useLogoutMutation, useRegistrationMutation,
    useForgotPasswordMutation, useConfirmEmailMutation, useResendConfirmEmailMutation,
    useUpdateNotificationsMutation, useChangePasswordMutation}
    = authApiSlice