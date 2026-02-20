import { Link } from "react-router-dom"
import { useSelector } from "react-redux"

import { useMeQuery } from "../store/auth/authApiSlice.js"
import { selectCurrentUser } from "../store/auth/authSelectors.js"
import { getApiErrorMessage } from "../utils/getApiErrorMessage.js"
import { ErrorBanner } from "../components/ui/ErrorBanner.jsx"
import { InlineLoader } from "../components/ui/InlineLoader.jsx"

import "./AccountPages.css"

const formatDateTime = (value) => {
    if (!value) {
        return "—"
    }
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) {
        return String(value)
    }
    return d.toLocaleString()
}

const formatMoney = (amount, currency) => {
    if (amount === null || amount === undefined) {
        return "—"
    }
    const n = Number(amount)
    if (Number.isNaN(n)) {
        return String(amount)
    }
    try {
        return new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: currency || "RUB",
            maximumFractionDigits: 2,
        }).format(n)
    } catch {
        return `${n} ${currency || ""}`.trim()
    }
}

export const ProfilePage = () => {
    const user = useSelector(selectCurrentUser)

    const { refetch, isFetching, isError, error } = useMeQuery(undefined, {
        refetchOnMountOrArgChange: true,
    })

    const email = user?.email ?? "—"
    const accountStatus = user?.acc_status ?? "—"
    const registeredAt = user?.created_at ?? null

    const billingAccount = user?.billing_account ?? null
    const billingId = billingAccount?.id ?? "—"
    const billingBalance = billingAccount?.balance ?? null
    const billingLimit = billingAccount?.negative_limit ?? null
    const billingCurrency = billingAccount?.currency ?? "RUB"

    const projects = Array.isArray(user?.projects) ? user.projects : []

    return (
        <section className="accountPage">
            <div className="accountHeader">
                <h2>Профиль</h2>
                <button className="accountBtn" onClick={() => refetch()} disabled={isFetching}>
                    {isFetching ? <InlineLoader label="Обновляем..." /> : "Обновить"}
                </button>
            </div>

            {isError ? (
                <ErrorBanner
                    title="Не удалось загрузить профиль"
                    message={getApiErrorMessage(error)}
                    onRetry={() => refetch()}
                />
            ) : null}

            <div className="accountGrid">
                <div className="accountCard">
                    <h3>Данные аккаунта</h3>

                    <div className="accountRow">
                        <span className="accountLabel">Email</span>
                        <span className="accountValue">{email}</span>
                    </div>

                    <div className="accountRow">
                        <span className="accountLabel">Статус аккаунта</span>
                        <span className="accountValue">{accountStatus}</span>
                    </div>

                    <div className="accountRow">
                        <span className="accountLabel">Дата регистрации</span>
                        <span className="accountValue">{formatDateTime(registeredAt)}</span>
                    </div>

                    <div style={{ marginTop: "0.75rem" }}>
                        <Link to="/settings" className="line">
                            Перейти в настройки →
                        </Link>
                    </div>
                </div>

                <div className="accountCard">
                    <h3>Платёжный профиль</h3>

                    <div className="accountRow">
                        <span className="accountLabel">ID</span>
                        <span className="accountValue">{billingId}</span>
                    </div>

                    <div className="accountRow">
                        <span className="accountLabel">Баланс</span>
                        <span className="accountValue">{formatMoney(billingBalance, billingCurrency)}</span>
                    </div>

                    <div className="accountRow">
                        <span className="accountLabel">Лимит</span>
                        <span className="accountValue">{formatMoney(billingLimit, billingCurrency)}</span>
                    </div>

                    {!billingAccount ? (
                        <p className="accountHint">Платёжный профиль не найден</p>
                    ) : null}
                </div>
            </div>

            <div className="accountCard" style={{ marginTop: "1rem" }}>
                <h3>Проекты</h3>

                {projects.length ? (
                    <div className="accountTableWrap">
                        <table className="accountTable">
                            <thead>
                            <tr>
                                <th>Название</th>
                                <th>Дата создания</th>
                                <th>Активен</th>
                            </tr>
                            </thead>
                            <tbody>
                            {projects.map((p) => (
                                <tr key={p.id}>
                                    <td>{p.name ?? "—"}</td>
                                    <td>{formatDateTime(p.created_at)}</td>
                                    <td>{p.is_active ? "Да" : "Нет"}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="accountHint">Нет проектов</p>
                )}
            </div>
        </section>
    )
}