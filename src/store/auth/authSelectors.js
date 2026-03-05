export const selectAuth = (state) => state.auth

export const selectCurrentUser = (state) => selectAuth(state)?.user ?? null
export const selectCurrentToken = (state) =>
    selectAuth(state)?.accessToken ?? null