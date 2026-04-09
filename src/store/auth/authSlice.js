import { createSlice } from "@reduxjs/toolkit";

const authSlice = createSlice(
    {
        name: "auth",
        initialState: {
            user: null,
            accessToken: null,
            authTransition: "idle"
        },
        reducers: {
            setCredentials: (state, action) => {
                state.user = action.payload.user;
                state.accessToken = action.payload.accessToken;
                state.authTransition = "idle";
            },
            tokenReceived: (state, action) => {
                state.accessToken = action.payload.accessToken;
                state.authTransition = "idle";
            },
            logout: (state) => {
                state.user = null;
                state.accessToken = null;
                state.authTransition = "idle";
            },
            setAuthTransition: (state, action) => {
                state.authTransition = action.payload ?? "idle"
            },
        }
    }
)
export const { setCredentials, tokenReceived, logout, setAuthTransition } = authSlice.actions;
export default authSlice.reducer;
