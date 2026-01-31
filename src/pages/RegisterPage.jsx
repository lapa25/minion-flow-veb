import React from 'react'
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import Link from "react-router";
import {registerSchema} from "../validation/authSchemas.js";

export const RegisterPage = () => {
    const {register,
        handleSubmit,
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

    const onSubmit = async (data) => {
        console.log(data);
    }

    const fieldClass = (name) =>
        errors[name] ? "inputInvalid" : (touchedFields[name] && dirtyFields[name]) ? "inputValid" : "input";

    return (
        <section>
            {/* Todo: отображение ошибки api при попытке регистрации*/}
            <p>
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
