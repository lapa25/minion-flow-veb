import {fetchBaseQuery} from "@reduxjs/toolkit/query";
import {Mutex} from "async-mutex";
import {tokenReceived, logout} from "../store/auth/authSlice.js";
import {mockBaseQuery} from "./mockBaseQuery.js";

const USE_MOCK = String(import.meta.env.VITE_MOCK_API ?? "").toLowerCase() === "true";
const BASE_URL = import.meta.env.VITE_API_URL ?? "";

const fetchQuery = fetchBaseQuery({
    baseUrl: BASE_URL,
    credentials: "include",
    prepareHeaders: (headers, { getState }) => {
        const token = getState()?.auth?.accessToken
        if (token) {
            headers.set('authorization', `Bearer ${token}`)
        }
        return headers
    },
})

const query = USE_MOCK
    ? async (args, api, extraOptions) => mockBaseQuery(args, api, extraOptions)
    : fetchQuery

const mutex = new Mutex();

export const queryWithReauth = async (args, api, extraOptions) => {
    await mutex.waitForUnlock();
    let res = await query(args, api, extraOptions);
    if (res?.error?.status === 401) {
        if (!mutex.isLocked()){
            const release = await mutex.acquire()
            try{
                const newRes = await query({
                    url: "/identity-service/api/sessions/refresh",
                    method: "POST",
                    body: {}
                }, api, extraOptions)
                if (newRes.data?.accessJWT) {
                    api.dispatch(tokenReceived({accessToken: newRes.data.accessJWT}))
                    res = await query(args, api, extraOptions)
                } else {
                    api.dispatch(logout())
                }

            } finally {
                release()
            }
        } else {
            await mutex.waitForUnlock()
            res = await query(args, api, extraOptions)
        }
    }
    return res
}
