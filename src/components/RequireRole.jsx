import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectCurrentRoles } from "../store/auth/authSelectors.js";

export const RequireRole = ({ roles = [] }) => {
    const location = useLocation()
    const currentRoles = useSelector(selectCurrentRoles)

    const allowed = roles.length? roles.some((r) => currentRoles.includes(r)) : true
    if (!allowed) {
        return (
            <Navigate to="/" replace
                state={{ from: location, reason: "Недостаточно прав" }}
            />
        );
    }
    return <Outlet />;
};
