import { useMemo } from "react"
import { Link } from "react-router-dom"
import { useSelector } from "react-redux"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { useUpdateUserInfoMutation, useChangePasswordMutation, useMeQuery }
    from "../store/auth/authApiSlice.js"
import {selectCurrentUser} from "../store/auth/authSelectors.js"
import {changePasswordSchema, updateUsernameSchema} from "../validation/authSchemas.js"
import { getFormFieldClass } from "../utils/getFormFieldClass.js"
import { getApiErrorMessage } from "../utils/getApiErrorMessage.js"
import { RefreshButton } from "../components/ui/RefreshButton.jsx"
import { ErrorBanner } from "../components/ui/ErrorBanner.jsx"
import { InlineLoader } from "../components/ui/InlineLoader.jsx"
import "../styles/AccountPages.css"

const SettingsSection = ({title, error, successMessage, children, style}) => {
    return (
        <div className="accountCard" style={style}>
            <h3>{title}</h3>
            {error ? (
                <ErrorBanner title="Ошибка" message={getApiErrorMessage(error)} />
            ) : null}
            {successMessage ? (
                <div className="accountSuccess" role="status">
                    {successMessage}
                </div>
            ) : null}
            {children}
        </div>
    )
}

export const SettingsPage = () => {
    const user = useSelector(selectCurrentUser)

    const { refetch, isFetching } = useMeQuery(undefined, {
        refetchOnMountOrArgChange: false});

    const usernameDefaults = useMemo(
        () => ({
            newUsername: user?.username ?? "",
        }),
        [user])

    const [updateUserInfo, {isLoading: userInfoLoading, isSuccess: userInfoSuccess,
        isError: userInfoIsError, error: userInfoError, reset: userInfoReset}] = useUpdateUserInfoMutation()

    const usernameForm = useForm({
        resolver: zodResolver(updateUsernameSchema),
        mode: "onChange",
        defaultValues: usernameDefaults,
        values: usernameDefaults
    })

    const onSaveUsername = async (data) => {
        if (userInfoSuccess || userInfoIsError) {
            userInfoReset()
        }
        await updateUserInfo({ newUsername: data.newUsername }).unwrap()
        refetch()
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

    const onChangePassword = async (data) => {
        if (pwdSuccess || pwdIsError) {
            pwdReset()
        }
        await changePassword({
            oldPassword: data.currentPassword,
            newPassword: data.newPassword,
        }).unwrap()
        pwdForm.reset()
    }

    return (
        <section className="accountPage">
            <div className="accountHeader">
                <h2>Настройки</h2>
                <RefreshButton
                    onClick={refetch}
                    isLoading={isFetching}
                    className="accountBtn"
                />
            </div>
            <p>
                <Link to="/profile" className="line">
                    ← Назад в профиль
                </Link>
            </p>
            <SettingsSection
                title="Имя пользователя"
                error={userInfoIsError ? userInfoError : null}
                successMessage={userInfoSuccess ? "Username обновлён" : null}
            >
                <form
                    onSubmit={usernameForm.handleSubmit(onSaveUsername)}
                    className="accountForm"
                >
                    <div className="accountFormRow">
                        <input
                            className={getFormFieldClass(usernameForm, "newUsername")}
                            type="text"
                            placeholder="Новое имя пользователя"
                            disabled={userInfoLoading}
                            {...usernameForm.register("newUsername", {
                                onChange: () =>
                                    (userInfoSuccess || userInfoIsError) && userInfoReset(),
                            })}
                        />
                        <p className={usernameForm.formState.errors.newUsername ? "instructions instructionsError" : ""}>
                            {usernameForm.formState.errors.newUsername?.message}
                        </p>
                    </div>
                    <button
                        className="accountBtn"
                        type="submit"
                        disabled={!usernameForm.formState.isValid || userInfoLoading}
                    >
                        {userInfoLoading ? <InlineLoader label="Сохраняем..." /> : "Сохранить"}
                    </button>
                </form>
            </SettingsSection>
            <SettingsSection
                title="Безопасность"
                error={pwdIsError ? pwdError : null}
                successMessage={pwdSuccess ? "Пароль обновлён" : null}
                style={{ marginTop: "1rem" }}
            >
                <form onSubmit={pwdForm.handleSubmit(onChangePassword)} className="accountForm">
                    <div className="accountFormRow">
                        <input
                            className={getFormFieldClass(pwdForm, "currentPassword")}
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
                            className={getFormFieldClass(pwdForm, "newPassword")}
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
                            className={getFormFieldClass(pwdForm, "confirmNewPassword")}
                            type="password"
                            autoComplete="new-password"
                            placeholder="Повторите новый пароль"
                            disabled={pwdLoading}
                            {...pwdForm.register("confirmNewPassword", {
                                onChange: () => (pwdSuccess || pwdIsError) && pwdReset(),
                            })}
                        />
                        <p className={pwdForm.formState.errors.confirmNewPassword ? "instructions instructionsError" : ""}>
                            {pwdForm.formState.errors.confirmNewPassword?.message}
                        </p>
                    </div>
                    <button
                        type="submit"
                        className="accountBtn"
                        disabled={
                            !pwdForm.formState.isValid ||
                            pwdForm.formState.isSubmitting ||
                            pwdLoading
                        }
                    >
                        {pwdLoading ? <InlineLoader label="Меняем..." /> : "Сменить пароль"}
                    </button>
                </form>
            </SettingsSection>
        </section>
    )
}