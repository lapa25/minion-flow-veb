import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import {Link, useNavigate} from "react-router-dom";
import {registerSchema} from "../validation/authSchemas.js";
import {useRegistrationMutation} from "../store/auth/authApiSlice.js";
import {getApiErrorMessage} from "../utils/getApiErrorMessage.js";
import {ErrorBanner} from "../components/ui/ErrorBanner.jsx";
import {AuthCard} from "../components/auth/AuthCard.jsx";
import {AuthInputField} from "../components/auth/AuthInputField.jsx";
import {getFormFieldClass} from "../utils/getFormFieldClass.js";
import {AuthSubmitButton} from "../components/auth/AuthSubmitButton.jsx";

export const RegisterPage = () => {
    const form = useForm({
        resolver: zodResolver(registerSchema),
        mode: "onChange",
        defaultValues: {
            username: "", email: "", password: "", confirmPassword: ""}
    })

    const {register, handleSubmit, reset, formState: {errors, isSubmitting, isValid}} = form

    const navigate = useNavigate();

    const [registration, { isLoading, isError, error }] = useRegistrationMutation();

    const onSubmit = async (data) => {
        const {confirmPassword: _confirmPassword,  ...payload } = data;
        await registration(payload).unwrap()
        reset();
        navigate("/confirm-email", {
                replace: true,
            }
        )
    }

    return (
        <AuthCard title="Регистрация">
            {isError ? (
                <ErrorBanner title="Ошибка регистрации" message={getApiErrorMessage(error)} />
            ) : null}
            <form onSubmit={handleSubmit(onSubmit)} autoComplete="on">
                <AuthInputField
                    type="text"
                    autoComplete="username"
                    placeholder="Имя пользователя"
                    className={getFormFieldClass(form, "username")}
                    registration={register("username")}
                    error={errors.username}
                />
                <AuthInputField
                    type="email"
                    autoComplete="email"
                    placeholder="Email"
                    className={getFormFieldClass(form, "email")}
                    registration={register("email")}
                    error={errors.email}
                />
                <AuthInputField
                    type="password"
                    autoComplete="new-password"
                    placeholder="Пароль"
                    className={getFormFieldClass(form, "password")}
                    registration={register("password")}
                    error={errors.password}
                />
                <AuthInputField
                    type="password"
                    autoComplete="new-password"
                    placeholder="Повторите пароль"
                    className={getFormFieldClass(form, "confirmPassword")}
                    registration={register("confirmPassword")}
                    error={errors.confirmPassword}
                />
                <AuthSubmitButton
                    disabled={!isValid || isSubmitting || isLoading}
                    isLoading={isLoading}
                    loadingLabel="Регистрируем..."
                >
                    Зарегистрироваться
                </AuthSubmitButton>
            </form>
            <p>
                Уже зарегистрированы?&#160;
                <Link to="/login" className="line">
                    Войти
                </Link>
            </p>
        </AuthCard>
    )
}
