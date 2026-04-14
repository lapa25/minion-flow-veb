import {apiSlice} from "../../api/apiSlice.js"
import {setCredentials} from "./authSlice"

export const authApiSlice = apiSlice.injectEndpoints({
    endpoints: (build) => ({
            registration: build.mutation({
                query: (body) => ({ url: "/identity-service/api/accounts", method: "POST", body })
            }),
            login: build.mutation({
                query: (body) => ({url: "/identity-service/api/sessions", method: "POST", body}),
            }),
            me: build.query({
                query: () => ({ url: "/identity-service/api/accounts/me" }),
                providesTags: ['Me'],
                async onQueryStarted(_arg, { dispatch, queryFulfilled, getState }) {
                    try {
                        const { data } = await queryFulfilled
                        const accessToken = getState()?.auth?.accessToken ?? null
                        dispatch(setCredentials({ user: data, accessToken }))
                    } catch {
                        // ошибки в ui
                    }
                },
            }),
            logout: build.mutation({
                query: () => ({url: "/identity-service/api/sessions/me", method: "DELETE", body: {}}),
            }),
            activateAccount: build.mutation({
                query: ({accountId, activationToken}) => ({
                    url: "/identity-service/api/account-activations", method: "POST",
                    params: {accountId, activationToken}
                }),
            }),
            forgotPassword: build.mutation({
                query: (body) => ({url: "/identity-service/api/password-resets", method: "POST", body}),
            }),
            finishPasswordReset: build.mutation({
                query: (body) => ({url: "/identity-service/api/password-resets", method: "PUT", body}),
            }),
            updateUserInfo: build.mutation({
                query: (body) => ({
                    url: "/identity-service/api/accounts/me", method: "PATCH", body}),
                invalidatesTags: ["Me"],
            }),
            changePassword: build.mutation({
                query: (body) => ({ url: "/identity-service/api/accounts/me/passwords",
                    method: "PATCH", body })
            }),
            refreshSession: build.mutation({
                query: () => ({
                    url: "/identity-service/api/sessions/refresh",
                    method: "POST",
                    body: {},
                }),
            }),
    })
})

export const {useRegistrationMutation, useLoginMutation, useMeQuery, useLazyMeQuery, useActivateAccountMutation,
    useLogoutMutation, useForgotPasswordMutation, useFinishPasswordResetMutation, useUpdateUserInfoMutation,
    useChangePasswordMutation, useRefreshSessionMutation} = authApiSlice