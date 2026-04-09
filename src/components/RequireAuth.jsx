import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { selectCurrentToken } from "../store/auth/authSelectors.js";

export const RequireAuth = () => {
    const accessToken = useSelector(selectCurrentToken)
    const location = useLocation()

    if (!accessToken) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }
    return <Outlet />;
};