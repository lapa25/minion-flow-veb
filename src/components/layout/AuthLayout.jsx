import { Outlet } from "react-router-dom";

import "./AuthLayout.css"

export const AuthLayout = () => {
    return (
        <div className="authLayout">
            <Outlet />
        </div>
    );
};
