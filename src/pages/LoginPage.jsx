import {Link, useNavigate, useLocation} from "react-router-dom";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {loginSchema} from "../validation/authSchemas.js";
import {useLazyMeQuery, useLoginMutation} from "../store/auth/authApiSlice.js";
import {getApiErrorMessage} from "../utils/getApiErrorMessage.js";
import {useMemo} from "react";
import {ErrorBanner} from "../components/ui/ErrorBanner.jsx";
import {useDispatch, useSelector} from "react-redux";
import {selectAuthTransition} from "../store/auth/authSelectors.js";
import {setAuthTransition, setCredentials, tokenReceived} from "../store/auth/authSlice.js";
import {AuthCard} from "../components/auth/AuthCard.jsx";
import {AuthInputField} from "../components/auth/AuthInputField.jsx";
import {getFormFieldClass} from "../utils/getFormFieldClass.js";
import {AuthSubmitButton} from "../components/auth/AuthSubmitButton.jsx";

export const LoginPage = () => {
    const dispatch = useDispatch()
    const authTransition = useSelector(selectAuthTransition)
    const isLoggingOut = authTransition === "loggingOut"

    const form = useForm({
        resolver: zodResolver(loginSchema),
        mode: "onChange",
        defaultValues: {
            email: "",
            password: "",
        },
    })

    const {register, handleSubmit, formState: {errors, isSubmitting, isValid}} = form

    const navigate = useNavigate();
    const location = useLocation();

    const reason = location.state?.reason;
    const notice = location.state?.notice;

    const returnTo = useMemo(() => {
        const from = location.state?.from;
        if (!from) {
            return "/";
        }
        const pathname = from.pathname || "/";
        const search = from.search || "";
        return `${pathname}${search}`;
    }, [location.state]);

    const [login, { isLoading, isError, error }] = useLoginMutation();
    const [triggerMe] = useLazyMeQuery();

    const onSubmit = async (formData) => {
        if (isLoggingOut) {
            return
        }
        dispatch(setAuthTransition("loggingIn"))
        try {
            const loginData = await login({
                email: formData.email,
                password: formData.password,
            }).unwrap()

            dispatch(tokenReceived({accessToken: loginData.accessJWT}))
            const meData = await triggerMe().unwrap()

            dispatch(setCredentials({user: meData, accessToken: loginData.accessJWT}))
            dispatch(setAuthTransition("idle"))
            navigate(returnTo, { replace: true })
        } catch {
            dispatch(setAuthTransition("idle"))
        }
    }

    return (
        <AuthCard title="Вход">
            {notice ? (
                <p className="instructions instructionsSuccess">{notice}</p>
            ) : null}
            {reason ? (
                <p className="instructions instructionsError">{reason}</p>
            ) : null}
            {isError ? (
                <ErrorBanner title="Ошибка входа" message={getApiErrorMessage(error)} />
            ) : null}
            <form onSubmit={handleSubmit(onSubmit)} autoComplete="on">
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
                    autoComplete="current-password"
                    placeholder="Пароль"
                    className={getFormFieldClass(form, "password")}
                    registration={register("password")}
                    error={errors.password}
                />
                <AuthSubmitButton
                    disabled={!isValid || isSubmitting || isLoading || isLoggingOut}
                    isLoading={isLoading}
                    loadingLabel="Входим..."
                    label={isLoggingOut ? "Завершаем выход..." : undefined}
                >
                    Войти
                </AuthSubmitButton>
            </form>
            <p>
                <Link to="/forgot-password" className="line">
                    Забыли пароль?
                </Link>
            </p>
            <p>
                Еще нет аккаунта?&#160;
                <Link to="/register" className="line">
                    Зарегистрироваться
                </Link>
            </p>
        </AuthCard>
    )
}