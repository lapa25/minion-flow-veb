import { Outlet } from "react-router-dom";

import "../../styles/AuthLayout.css"

export const AuthLayout = () => {
    return (
        <div className="authLayout">
            <Outlet />
        </div>
    );
};
