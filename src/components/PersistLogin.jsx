import { Outlet, useLocation, Navigate } from "react-router-dom";
import {useDispatch, useSelector} from "react-redux";
import {useLazyMeQuery, useRefreshSessionMutation} from "../store/auth/authApiSlice.js";
import {selectCurrentToken, selectCurrentUser} from "../store/auth/authSelectors.js";
import { FullPageSpinner } from "./ui/FullPageSpinner.jsx";
import { getApiErrorMessage } from "../utils/getApiErrorMessage.js";
import {useEffect, useState} from "react";
import {setCredentials, tokenReceived} from "../store/auth/authSlice.js";

export const PersistLogin = () => {
    const dispatch = useDispatch()
    const location = useLocation()

    const user = useSelector(selectCurrentUser)
    const accessToken = useSelector(selectCurrentToken)

    const [isReady, setIsReady] = useState(Boolean(user && accessToken))
    const [restoreError, setRestoreError] = useState(null)

    const [refreshSession] = useRefreshSessionMutation()
    const [triggerMe] = useLazyMeQuery()

    useEffect(() => {
        let cancelled = false
        const restoreSession = async () => {
            if (user && accessToken) {
                if (!cancelled) {
                    setRestoreError(null)
                    setIsReady(true)
                }
                return
            }
            if (!cancelled) {
                setIsReady(false)
                setRestoreError(null)
            }
            try {
                if (!accessToken) {
                    const refreshData = await refreshSession().unwrap()
                    const nextToken = refreshData?.accessJWT

                    if (!nextToken) {
                        throw new Error("Не удалось восстановить access token");
                    }
                    dispatch(tokenReceived({ accessToken: nextToken }));
                    return;
                }
                const meData = await triggerMe().unwrap();
                if (!cancelled) {
                    dispatch(
                        setCredentials({
                            user: meData,
                            accessToken,
                        })
                    )
                    setRestoreError(null)
                    setIsReady(true)
                }
            } catch (error) {
                if (!cancelled) {
                    setRestoreError(error)
                    setIsReady(false)
                }
            }
        }
        void restoreSession()
        return () => {
            cancelled = true
        }
    }, [user, accessToken, refreshSession, triggerMe, dispatch])

    if (user && accessToken) {
        return <Outlet />
    }

    if (!restoreError && !isReady) {
        return <FullPageSpinner label="Восстанавливаем сессию..." />
    }

    if (restoreError) {
        return (
            <Navigate to="/login" replace
                state={{
                    from: location,
                    reason: getApiErrorMessage(restoreError, "Пожалуйста, войдите в систему"),
                }}
            />
        );
    }
    return <Outlet />;
};
