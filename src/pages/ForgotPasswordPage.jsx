import { Link } from "react-router";
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { forgotPasswordSchema } from "../validation/authSchemas.js"
import { useForgotPasswordMutation } from "../store/auth/authApiSlice.js"
import { getApiErrorMessage } from "../utils/getApiErrorMessage.js"
import { InlineLoader } from "../components/ui/InlineLoader.jsx"
import {ErrorBanner} from "../components/ui/ErrorBanner.jsx"

export const ForgotPasswordPage = () => {

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting, isValid, touchedFields, dirtyFields},
    } = useForm({
        resolver: zodResolver(forgotPasswordSchema),
        mode: "onChange",
        defaultValues: { email: "" },
    })

    const [forgotPassword, { isLoading, isSuccess, isError, error }] = useForgotPasswordMutation()

    const onSubmit = async (data) => {
        await forgotPassword({ email: data.email })
        reset()
    };

    return (
        <section className="authCard">
            <h2>Восстановление пароля</h2>

            {isSuccess ? (
                <p className="instructions instructionsSuccess">
                    Если такой email существует, мы отправили письмо с инструкцией по восстановлению пароля.
                </p>
            ) : (
                <p style={{ opacity: 0.9 }}>
                    Укажите email — мы отправим инструкции, если адрес зарегистрирован.
                </p>
            )}

            {isError ? (
                <ErrorBanner title="Ошибка" message={getApiErrorMessage(error)} />
            ) : null}

            <form onSubmit={handleSubmit(onSubmit)} autoComplete="on">
                <input
                    className={
                        errors.email ? "inputInvalid"
                        : touchedFields.email && dirtyFields.email ? "inputValid"
                        : "input"
                    }
                    type="email"
                    autoComplete="email"
                    placeholder="Email"
                    {...register("email")}
                />
                <p className={errors.email ? "instructions instructionsError" : ""}>
                    {errors.email?.message}
                </p>
                <button type="submit" disabled={!isValid || isSubmitting || isLoading}>
                    {isLoading ? <InlineLoader label="Отправляем..." /> : "Отправить"}
                </button>
            </form>
            <p>
                <Link to="/login" className="line">К входу</Link>
            </p>
        </section>
    );
};
