import { useEffect, useMemo, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { useConfirmEmailMutation, useResendConfirmEmailMutation } from "../store/auth/authApiSlice.js"
import { confirmEmailCodeSchema, resendConfirmEmailSchema } from "../validation/authSchemas.js"

import { getApiErrorMessage } from "../utils/getApiErrorMessage.js"
import { ErrorBanner } from "../components/ui/ErrorBanner.jsx"
import { InlineLoader } from "../components/ui/InlineLoader.jsx"

const RESEND_COOLDOWN_SEC = 120

export const ConfirmEmailPage = () => {
    const location = useLocation()
    const navigate = useNavigate()

    const emailFromState = location.state?.email || ""
    const initialEmail = useMemo(() => String(emailFromState || "").trim(), [emailFromState])

    const [cooldownLeft, setCooldownLeft] = useState(0)

    const confirmForm = useForm({
        resolver: zodResolver(confirmEmailCodeSchema),
        mode: "onChange",
        defaultValues: { email: initialEmail, code: "" },
        values: { email: initialEmail, code: "" },
    })

    const [
        confirmEmail,
        { isLoading: isConfirming, isError: confirmIsError, error: confirmError },
    ] = useConfirmEmailMutation()

    const onConfirm = async (data) => {
        const res = await confirmEmail({ email: data.email, code: data.code })
        if ("data" in res) {
            navigate("/login", {
                replace: true,
                state: { notice: "Почта подтверждена. Теперь войдите в аккаунт." },
            })
        }
    }

    const resendForm = useForm({
        resolver: zodResolver(resendConfirmEmailSchema),
        mode: "onChange",
        defaultValues: { email: initialEmail },
        values: { email: initialEmail },
    })

    const [
        resendConfirmEmail,
        { isLoading: isResending, isSuccess: resendSuccess, isError: resendIsError, error: resendError },
    ] = useResendConfirmEmailMutation()

    const startCooldown = () => setCooldownLeft(RESEND_COOLDOWN_SEC)

    useEffect(() => {
        if (cooldownLeft <= 0) {
            return
        }

        const id = setTimeout(() => {
            setCooldownLeft((s) => Math.max(0, s - 1))
        }, 1000)

        return () => clearTimeout(id)
    }, [cooldownLeft])

    const onResend = async (data) => {
        if (cooldownLeft > 0) {
            return
        }

        const res = await resendConfirmEmail({ email: data.email })

        if ("data" in res) {
            startCooldown()
        }
    }

    const emailValue = initialEmail

    return (
        <section className="authCard">
            <h2>Подтверждение почты</h2>

            <p style={{ opacity: 0.9, marginTop: "0.5rem" }}>
                Мы отправили код на <b>{emailValue || "ваш email"}</b>. Введите код из письма (4–6 цифр).
            </p>

            {!emailValue ? (
                <ErrorBanner
                    title="Не указан email"
                    message="Откройте страницу подтверждения сразу после регистрации, либо укажите email и запросите код повторно."
                />
            ) : null}

            {confirmIsError ? (
                <ErrorBanner title="Не удалось подтвердить email" message={getApiErrorMessage(confirmError)} />
            ) : null}

            <form onSubmit={confirmForm.handleSubmit(onConfirm)} autoComplete="on">
                <input
                    className={confirmForm.formState.errors.email ? "inputInvalid" : "input"}
                    type="email"
                    autoComplete="email"
                    placeholder="Email"
                    disabled
                    {...confirmForm.register("email")}
                />
                <p className={confirmForm.formState.errors.email ? "instructions instructionsError" : ""}>
                    {confirmForm.formState.errors.email?.message}
                </p>

                <input
                    className={confirmForm.formState.errors.code ? "inputInvalid" : "input"}
                    type="number"
                    inputMode="numeric"
                    placeholder="Код (4–6 цифр)"
                    autoComplete="one-time-code"
                    {...confirmForm.register("code")}
                />
                <p className={confirmForm.formState.errors.code ? "instructions instructionsError" : ""}>
                    {confirmForm.formState.errors.code?.message}
                </p>

                <button
                    type="submit"
                    disabled={!confirmForm.formState.isValid || confirmForm.formState.isSubmitting || isConfirming}
                >
                    {isConfirming ? <InlineLoader label="Проверяем..." /> : "Подтвердить"}
                </button>
            </form>

            <div style={{ marginTop: "1rem" }}>
                <h3 style={{ margin: "0.75rem 0 0.25rem" }}>Код не пришёл?</h3>

                {resendIsError ? (
                    <ErrorBanner title="Не удалось отправить код" message={getApiErrorMessage(resendError)} />
                ) : null}

                {resendSuccess ? (
                    <p className="instructions instructionsSuccess">Если адрес существует, мы отправили новый код.</p>
                ) : (
                    <p style={{ opacity: 0.9 }}>Можно отправить код повторно, но не чаще одного раза в 2 минуты.</p>
                )}

                <form onSubmit={resendForm.handleSubmit(onResend)} autoComplete="on">
                    <input
                        className={resendForm.formState.errors.email ? "inputInvalid" : "input"}
                        type="email"
                        autoComplete="email"
                        placeholder="Email"
                        {...resendForm.register("email")}
                    />
                    <p className={resendForm.formState.errors.email ? "instructions instructionsError" : ""}>
                        {resendForm.formState.errors.email?.message}
                    </p>

                    <button
                        type="submit"
                        disabled={
                            !resendForm.formState.isValid ||
                            resendForm.formState.isSubmitting ||
                            isResending ||
                            cooldownLeft > 0
                        }
                    >
                        {isResending ? (
                            <InlineLoader label="Отправляем..." />
                        ) : cooldownLeft > 0 ? (
                            `Повтор через ${cooldownLeft}s`
                        ) : (
                            "Отправить код повторно"
                        )}
                    </button>
                </form>
            </div>

            <p style={{ marginTop: "1rem" }}>
                <Link to="/login" className="line">
                    К входу
                </Link>
            </p>
        </section>
    )
}