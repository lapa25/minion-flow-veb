import {createApi} from '@reduxjs/toolkit/query/react';
import {queryWithReauth} from "./queryWithReauth.js";

export const apiSlice = createApi({
    reducerPath: "api",
    baseQuery: queryWithReauth,
    tagTypes: ["Me"],
    endpoints: () => ({
    })
})
