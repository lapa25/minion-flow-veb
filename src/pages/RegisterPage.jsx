import {useState} from 'react'
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import {Link, useNavigate} from "react-router";
import {registerSchema} from "../validation/authSchemas.js";
import {useRegistrationMutation} from "../store/auth/authApiSlice.js";
import {getApiErrorMessage} from "../utils/getApiErrorMessage.js";

export const RegisterPage = () => {
    const {register,
        handleSubmit,
        reset,
        formState: {errors, isSubmitting, isValid, touchedFields, dirtyFields},
    } = useForm({
        resolver: zodResolver(registerSchema),
        mode: "onChange",
        defaultValues: {
            login: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
    });

    const navigate = useNavigate();
    const [apiError, setApiError] = useState("");
    const [apiSuccess, setApiSuccess] = useState("");

    const [registration] = useRegistrationMutation();

    const onSubmit = async (data) => {
        setApiError("");
        setApiSuccess("");

        const {  ...payload } = data;

        try {
            await registration(payload).unwrap();
            setApiSuccess("Регистрация успешна");
            reset();
            navigate("/login", { replace: true });
        } catch (err) {
            setApiError(getApiErrorMessage(err));
        }
    }

    const fieldClass = (name) =>
        errors[name] ? "inputInvalid" : (touchedFields[name] && dirtyFields[name]) ? "inputValid" : "input";

    return (
        <section>
            <p className={apiError ? "instructions instructionsError" : "offscreen"}>
                {apiError}
            </p>

            <p className={apiSuccess ? "instructions instructionsSuccess" : "offscreen"}>
                {apiSuccess}
            </p>
            <h2>Регистрация:</h2>
            <form onSubmit={handleSubmit(onSubmit)} autoComplete="on">

                <input className={fieldClass("login")}
                       type="text"
                       placeholder="Имя пользователя"
                       autoComplete="username"
                       {...register("login")} />
                <p className={errors.login? "instructions instructionsError": ""}>{
                    errors.login?.message}</p>

                <input className={fieldClass("email")}
                       type="email"
                       autoComplete="email"
                       placeholder="Email"
                       {...register("email")} />
                <p className={errors.email? "instructions instructionsError": ""}>
                    {errors.email?.message}</p>

                <input className={fieldClass("password")}
                       type="password"
                       autoComplete="new-password"
                       placeholder="Пароль"
                       {...register("password")} />
                <p className={errors.password? "instructions instructionsError": ""}>
                    {errors.password?.message}</p>

                <input className={fieldClass("confirmPassword")}
                       type="password"
                       autoComplete="new-password"
                       placeholder="Повторите пароль"
                       {...register("confirmPassword")} />
                <p className={errors.confirmPassword? "instructions instructionsError": ""}>
                    {errors.confirmPassword?.message}</p>

                <button type="submit" disabled={!isValid || isSubmitting}>Зарегистрироваться</button>
            </form>
            <p>
                Уже зарегистрированы?&#160;
                <Link to="/login" className="line">
                    Войти
                </Link>
            </p>
        </section>
    )
}
