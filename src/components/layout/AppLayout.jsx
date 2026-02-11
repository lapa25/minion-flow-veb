import { NavLink, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { useLogoutMutation } from "../../store/auth/authApiSlice.js";
import { selectCurrentUser } from "../../store/auth/authSelectors.js";
import { InlineLoader } from "../ui/InlineLoader.jsx";
import { ErrorBanner } from "../ui/ErrorBanner.jsx";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage.js";

import "./AppLayout.css"

const navLinkStyle = ({ isActive }) => ({
    textDecoration: "none",
    fontWeight: isActive ? 700 : 400,
});

export const AppLayout = () => {
    const user = useSelector(selectCurrentUser);
    const [logout, { isLoading: isLogoutLoading, isError, error }] =
        useLogoutMutation()
    return (
        <div className="appShell">
            <header className="appHeader">
                <div className="appBrand">Minion Flow</div>
                <nav className="appNav">
                    <NavLink to="/projects" style={navLinkStyle}>
                        Проекты
                    </NavLink>
                    <NavLink to="/profile" style={navLinkStyle}>
                        Профиль
                    </NavLink>
                </nav>
                <div className="appUser">
                    <span className="appUserName">{user?.login || user?.email || ""}</span>
                    <button className="appUserLogoutButton" onClick={() => logout()}
                            disabled={isLogoutLoading}>
                        {isLogoutLoading ? <InlineLoader label="Выход..." /> : "Выйти"}
                    </button>
                </div>
            </header>
            {isError ? (
                <div style={{ padding: 16 }}>
                    <ErrorBanner
                        title="Не удалось выполнить выход"
                        message={getApiErrorMessage(error)}
                    />
                </div>
            ) : null}
            <main className="appMain">
                <Outlet />
            </main>
        </div>
    );
};
