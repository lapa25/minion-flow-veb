import {fetchBaseQuery} from "@reduxjs/toolkit/query";
import {Mutex} from "async-mutex";
import {tokenReceived, logout} from "../store/auth/authSlice.js";

const BASE_URL = "";

const query = fetchBaseQuery({
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

const mutex = new Mutex();

export const queryWithReauth = async (args, api, extraOptions) => {
    await mutex.waitForUnlock();
    let res = await query(args, api, extraOptions);
    if (res?.error?.status === 401) {
        if (!mutex.isLocked()){
            const release = await mutex.acquire()
            try{
                const newRes = await query({
                    url: "/auth/refresh",
                    method: "POST",
                }, api, extraOptions)
                if (newRes.data?.accessToken) {
                    api.dispatch(tokenReceived({accessToken: newRes.data.accessToken}))
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
