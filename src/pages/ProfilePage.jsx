import { Link } from "react-router-dom"
import { useSelector } from "react-redux"
import { useMeQuery } from "../store/auth/authApiSlice.js"
import { selectCurrentUser } from "../store/auth/authSelectors.js"
import { getApiErrorMessage } from "../utils/getApiErrorMessage.js"
import { ErrorBanner } from "../components/ui/ErrorBanner.jsx"
import "./AccountPages.css"
import {RefreshButton} from "../components/ui/RefreshButton.jsx";

export const ProfilePage = () => {
    const user = useSelector(selectCurrentUser)

    const { refetch, isFetching, isError, error } = useMeQuery(undefined, {
        refetchOnMountOrArgChange: true,
    })

    return (
        <section className="accountPage">
            <div className="accountHeader">
                <h2>Профиль</h2>
                <RefreshButton
                    onClick={refetch}
                    isLoading={isFetching}
                    className="accountBtn"
                />
            </div>

            {isError ? (
                <ErrorBanner
                    title="Не удалось загрузить профиль"
                    message={getApiErrorMessage(error)}
                    onRetry={() => refetch()}
                />
            ) : null}

            <div className="accountCard">
                <h3>Данные аккаунта</h3>

                <div className="accountRow">
                    <span className="accountLabel">User ID</span>
                    <span className="accountValue">{user?.userId ?? "—"}</span>
                </div>

                <div className="accountRow">
                    <span className="accountLabel">Username</span>
                    <span className="accountValue">{user?.username ?? "—"}</span>
                </div>

                <div className="accountRow">
                    <span className="accountLabel">Email</span>
                    <span className="accountValue">{user?.email ?? "—"}</span>
                </div>

                <div className="accountRow">
                    <span className="accountLabel">Статус</span>
                    <span className="accountValue">{user?.status ?? "—"}</span>
                </div>

                <div style={{ marginTop: "0.75rem" }}>
                    <Link to="/settings" className="line">
                        Перейти в настройки →
                    </Link>
                </div>
            </div>
        </section>
    )
}