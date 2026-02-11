import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { selectCurrentToken, selectCurrentUser } from "../store/auth/authSelectors.js";

export const RequireAuth = () => {
    const accessToken = useSelector(selectCurrentToken)
    const user = useSelector(selectCurrentUser)
    const location = useLocation()

    if (!accessToken && !user) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }
    return <Outlet />;
};
