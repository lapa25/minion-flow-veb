import {Link, useNavigate, useLocation} from "react-router";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {loginSchema} from "../validation/authSchemas.js";
import {useLoginMutation} from "../store/auth/authApiSlice.js";
import {getApiErrorMessage} from "../utils/getApiErrorMessage.js";
import {useMemo} from "react";
import {InlineLoader} from "../components/ui/InlineLoader.jsx";
import {ErrorBanner} from "../components/ui/ErrorBanner.jsx";


export const LoginPage = () => {
    const {register,
        handleSubmit,
        formState: {errors, isSubmitting, isValid, touchedFields, dirtyFields},
    } = useForm({
        resolver: zodResolver(loginSchema),
        mode: "onChange",
        defaultValues: {
            email: "",
            password: "",
        },
    });

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

    const onSubmit = async (data) => {
        const res = await login({ email: data.email, password: data.password });
        if ("data" in res) {
            navigate(returnTo, { replace: true });
        }
    }

    return (
        <section className="authCard">
            {notice ? (
                <p className="instructions instructionsSuccess">{notice}</p>
            ) : null}

            {reason ? (
                <p className="instructions instructionsError">{reason}</p>
            ) : null}

            {isError ? (
                <ErrorBanner title="Ошибка входа" message={getApiErrorMessage(error)} />
            ) : null}

            <h2>Вход:</h2>

            <form onSubmit={handleSubmit(onSubmit)} autoComplete="on">

                <input className={
                        errors.email
                        ? "inputInvalid"
                        : touchedFields.email && dirtyFields.email
                            ? "inputValid"
                            : "input"}
                       type="email"
                       autoComplete="email"
                       placeholder="Email"
                       {...register("email")} />
                <p className={errors.email? "instructions instructionsError": ""}>{errors.email?.message}</p>

                <input className={
                        errors.password ? "inputInvalid"
                        : touchedFields.password && dirtyFields.password ? "inputValid"
                            : "input"}
                       type="password"
                       autoComplete="current-password"
                       placeholder="Пароль"
                       {...register("password")} />
                <p className={errors.password? "instructions instructionsError": ""}>{errors.password?.message}</p>

                <button type="submit" disabled={!isValid || isSubmitting || isLoading}>
                    {isLoading ? <InlineLoader label="Входим..." /> : "Войти"}
                </button>
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
        </section>
    )
}
