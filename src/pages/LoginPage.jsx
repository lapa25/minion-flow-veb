import {useState} from "react";
import {Link, useNavigate} from "react-router";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {loginSchema} from "../validation/authSchemas.js";
import {useLoginMutation} from "../store/auth/authApiSlice.js";
import {getApiErrorMessage} from "../utils/getApiErrorMessage.js";


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
    const [apiError, setApiError] = useState("");

    const [login] = useLoginMutation();

    const onSubmit = async (data) => {
        setApiError("");
        try {
            await login({ email: data.email, password: data.password }).unwrap()
            navigate("/", { replace: true })
        } catch (err) {
            setApiError(getApiErrorMessage(err))
        }
    }

    return (
        <section>
            <p className={apiError ? "instructions instructionsError" : "offscreen"}>
                {apiError}
            </p>
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

                <button type="submit" disabled={!isValid || isSubmitting}>Войти</button>
            </form>
            <p>
                Еще нет аккаунта?&#160;
                <Link to="/register" className="line">
                    Зарегистрироваться
                </Link>
            </p>
        </section>
    )
}
