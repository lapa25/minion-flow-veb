import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useLogoutMutation } from "../../store/auth/authApiSlice.js";
import { selectCurrentUser } from "../../store/auth/authSelectors.js";
import { logout, setAuthTransition } from "../../store/auth/authSlice.js";
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
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const [logoutRequest, { isLoading: isLoggingOut, isError, error}] = useLogoutMutation()
    const handleLogout = async () => {
        dispatch(setAuthTransition("loggingOut"))
        try {
            await logoutRequest().unwrap()
        } finally {
            dispatch(logout())
            navigate("/login", {replace: true,
                state: {
                    notice: "Вы вышли из системы",
                },
            })
        }
    }
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
                    <span className="appUserName">{user?.username || user?.email || ""}</span>
                    <button className="appUserLogoutButton" onClick={handleLogout} disabled={isLoggingOut} type="button">
                        {isLoggingOut ? <InlineLoader label="Выход..." /> : "Выйти"}
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
