import { Outlet, useLocation, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useMeQuery } from "../store/auth/authApiSlice.js";
import { selectCurrentUser } from "../store/auth/authSelectors.js";
import { FullPageSpinner } from "./ui/FullPageSpinner.jsx";
import { getApiErrorMessage } from "../utils/getApiErrorMessage.js";

export const PersistLogin = () => {
    const location = useLocation()
    const user = useSelector(selectCurrentUser)

    const shouldSkip = Boolean(user)

    const { isLoading, isFetching, isError, error } = useMeQuery(undefined, {
        skip: shouldSkip,
        refetchOnMountOrArgChange: true,
    })
    if (shouldSkip) {
        return <Outlet />;
    }
    if (isLoading || isFetching) {
        return <FullPageSpinner label="Восстанавливаем сессию..." />;
    }
    if (isError) {
        return (
            <Navigate to="/login" replace
                state={{
                    from: location,
                    reason: getApiErrorMessage(error, "Пожалуйста, войдите в систему"),
                }}
            />
        );
    }
    return <Outlet />;
};
