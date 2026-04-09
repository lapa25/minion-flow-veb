import {Link, useNavigate, useSearchParams} from "react-router-dom"
import {useForm} from "react-hook-form"
import {zodResolver} from "@hookform/resolvers/zod"
import {resetPasswordSchema} from "../validation/authSchemas.js"
import {useFinishPasswordResetMutation} from "../store/auth/authApiSlice.js"
import {getApiErrorMessage} from "../utils/getApiErrorMessage.js"
import {ErrorBanner} from "../components/ui/ErrorBanner.jsx"
import {AuthCard} from "../components/auth/AuthCard.jsx";
import {AuthInputField} from "../components/auth/AuthInputField.jsx";
import {getFormFieldClass} from "../utils/getFormFieldClass.js";
import {AuthSubmitButton} from "../components/auth/AuthSubmitButton.jsx";

export const ResetPasswordPage = () => {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const userId = searchParams.get("userId") || ""
    const verificationToken = searchParams.get("verificationToken") || ""

    const form = useForm({
        resolver: zodResolver(resetPasswordSchema),
        mode: "onChange",
        defaultValues: {password: "", confirmPassword: ""},
    })

    const {register, handleSubmit, formState: {errors, isSubmitting, isValid}} = form

    const [finishPasswordReset, {isLoading, isError, error}] = useFinishPasswordResetMutation()

    const onSubmit = async (data) => {
        await finishPasswordReset({userId, verificationToken, password: data.password}).unwrap()
        navigate("/login", {
            replace: true,
            state: { notice: "Пароль обновлён. Теперь войдите с новым паролем." },
        })
    }
    const invalidLink = !userId || !verificationToken
    return (
        <AuthCard title="Новый пароль">
            {invalidLink ? (
                <>
                    <ErrorBanner
                        title="Некорректная ссылка"
                        message="В ссылке отсутствуют userId или verificationToken."
                    />
                    <p>
                        <Link to="/forgot-password" className="line">
                            Запросить восстановление заново
                        </Link>
                    </p>
                </>
            ) : (
                <>
                    {isError ? (
                        <ErrorBanner
                            title="Не удалось обновить пароль"
                            message={getApiErrorMessage(error)}
                        />
                    ) : null}
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <AuthInputField
                            type="password"
                            autoComplete="new-password"
                            placeholder="Новый пароль"
                            className={getFormFieldClass(form, "password")}
                            registration={register("password")}
                            error={errors.password}
                        />
                        <AuthInputField
                            type="password"
                            autoComplete="new-password"
                            placeholder="Повторите новый пароль"
                            className={getFormFieldClass(form, "confirmPassword")}
                            registration={register("confirmPassword")}
                            error={errors.confirmPassword}
                        />
                        <AuthSubmitButton
                            disabled={!isValid || isSubmitting || isLoading}
                            isLoading={isLoading}
                            loadingLabel="Сохраняем..."
                        >
                            Сохранить пароль
                        </AuthSubmitButton>
                    </form>
                </>
            )}
        </AuthCard>
    )
}