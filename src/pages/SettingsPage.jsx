import { useMemo } from "react"
import { Link } from "react-router-dom"
import { useSelector } from "react-redux"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import {useUpdateNotificationsMutation, useChangePasswordMutation, useMeQuery}
    from "../store/auth/authApiSlice.js"
import {selectCurrentUser} from "../store/auth/authSelectors.js"
import { changePasswordSchema } from "../validation/authSchemas.js"
import { getApiErrorMessage } from "../utils/getApiErrorMessage.js"
import { ErrorBanner } from "../components/ui/ErrorBanner.jsx"
import { InlineLoader } from "../components/ui/InlineLoader.jsx"

import "./AccountPages.css"

export const SettingsPage = () => {
    const user = useSelector(selectCurrentUser)

    const { refetch, isFetching } = useMeQuery(undefined, {
        refetchOnMountOrArgChange: false});

    const notificationDefaults = useMemo(() => {
        const n = user?.notifications || user?.settings?.notifications || {}
        return {
            emailNotifications: Boolean(n.emailNotifications ?? true),
            securityAlerts: Boolean(n.securityAlerts ?? true),
        }
    }, [user])

    const [updateNotifications, {
        isLoading: notifLoading,
        isSuccess: notifSuccess,
        isError: notifIsError,
        error: notifError,
        reset: notifReset,
    }] = useUpdateNotificationsMutation()

    const notifForm = useForm({
        mode: "onChange",
        defaultValues: notificationDefaults,
        values: notificationDefaults,
    })

    const onSaveNotifications = async (data) => {
        if (notifSuccess || notifIsError) {
            notifReset()
        }
        await updateNotifications(data)
    }

    const [changePassword, {
        isLoading: pwdLoading,
        isSuccess: pwdSuccess,
        isError: pwdIsError,
        error: pwdError,
        reset: pwdReset,
    }] = useChangePasswordMutation()

    const pwdForm = useForm({
        resolver: zodResolver(changePasswordSchema),
        mode: "onChange",
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmNewPassword: "",
        },
    })

    const pwdFieldClass = (name) => {
        const { errors, touchedFields, dirtyFields } = pwdForm.formState
        return errors[name]
            ? "inputInvalid" : touchedFields[name] && dirtyFields[name]
                ? "inputValid" : "input"
    }

    const onChangePassword = async (data) => {
        if (pwdSuccess || pwdIsError) {
            pwdReset()
        }
        const res = await changePassword({
            currentPassword: data.currentPassword,
            newPassword: data.newPassword,
        });

        if ("data" in res) {
            pwdForm.reset();
        }
    };

    return (
        <section className="accountPage">
            <div className="accountHeader">
                <h2>Настройки</h2>
                <button className="accountBtn" onClick={() => refetch()} disabled={isFetching}>
                    {isFetching ? <InlineLoader label="Обновляем..." /> : "Обновить"}
                </button>
            </div>

            <p>
                <Link to="/profile" className="line">
                    ← Назад в профиль
                </Link>
            </p>

            <div className="accountCard">
                <h3>Уведомления</h3>

                {notifIsError ? (
                    <ErrorBanner title="Ошибка" message={getApiErrorMessage(notifError)} />
                ) : null}

                {notifSuccess ? (
                    <div className="accountSuccess" role="status">
                        Настройки уведомлений сохранены
                    </div>
                ) : null}

                <form onSubmit={notifForm.handleSubmit(onSaveNotifications)}>
                    <label className="accountCheckbox">
                        <input
                            type="checkbox"
                            disabled={notifLoading}
                            {...notifForm.register("emailNotifications", {
                                onChange: () => (notifSuccess || notifIsError) && notifReset(),
                            })}
                        />
                        Email-уведомления
                    </label>

                    <label className="accountCheckbox">
                        <input
                            type="checkbox"
                            disabled={notifLoading}
                            {...notifForm.register("securityAlerts", {
                                onChange: () => (notifSuccess || notifIsError) && notifReset(),
                            })}
                        />
                        Уведомления безопасности
                    </label>

                    <button
                        className="accountBtn"
                        type="submit"
                        disabled={notifLoading}>
                        {notifLoading ? <InlineLoader label="Сохраняем..." /> : "Сохранить"}
                    </button>
                </form>
            </div>

            <div className="accountCard">
                <h3>Безопасность</h3>

                {pwdIsError ? (
                    <ErrorBanner title="Ошибка" message={getApiErrorMessage(pwdError)} />
                ) : null}

                {pwdSuccess ? (
                    <div className="accountSuccess" role="status">
                        Пароль обновлён
                    </div>
                ) : null}

                <form onSubmit={pwdForm.handleSubmit(onChangePassword)} className="accountForm">
                    <div className="accountFormRow">
                        <input
                            className={pwdFieldClass("currentPassword")}
                            type="password"
                            autoComplete="current-password"
                            placeholder="Текущий пароль"
                            disabled={pwdLoading}
                            {...pwdForm.register("currentPassword", {
                                onChange: () => (pwdSuccess || pwdIsError) && pwdReset(),
                            })}
                        />
                        <p className={pwdForm.formState.errors.currentPassword ? "instructions instructionsError" : ""}>
                            {pwdForm.formState.errors.currentPassword?.message}
                        </p>
                    </div>

                    <div className="accountFormRow">
                        <input
                            className={pwdFieldClass("newPassword")}
                            type="password"
                            autoComplete="new-password"
                            placeholder="Новый пароль"
                            disabled={pwdLoading}
                            {...pwdForm.register("newPassword", {
                                onChange: () => (pwdSuccess || pwdIsError) && pwdReset(),
                            })}
                        />
                        <p className={pwdForm.formState.errors.newPassword ? "instructions instructionsError" : ""}>
                            {pwdForm.formState.errors.newPassword?.message}
                        </p>
                    </div>

                    <div className="accountFormRow">
                        <input
                            className={pwdFieldClass("confirmNewPassword")}
                            type="password"
                            autoComplete="new-password"
                            placeholder="Повторите новый пароль"
                            disabled={pwdLoading}
                            {...pwdForm.register("confirmNewPassword", {
                                onChange: () => (pwdSuccess || pwdIsError) && pwdReset(),
                            })}
                        />
                        <p className={pwdForm.formState.errors.confirmNewPassword ? "instructions instructionsError":""}>
                            {pwdForm.formState.errors.confirmNewPassword?.message}
                        </p>
                    </div>

                    <button
                        type="submit"
                        className="accountBtn"
                        disabled={!pwdForm.formState.isValid
                            || pwdForm.formState.isSubmitting || pwdLoading}>
                        {pwdLoading ? <InlineLoader label="Меняем..." /> : "Сменить пароль"}
                    </button>
                </form>
            </div>
        </section>
    )
}
