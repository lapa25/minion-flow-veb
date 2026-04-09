import { Link } from "react-router-dom";
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { forgotPasswordSchema } from "../validation/authSchemas.js"
import { useForgotPasswordMutation } from "../store/auth/authApiSlice.js"
import { getApiErrorMessage } from "../utils/getApiErrorMessage.js"
import {ErrorBanner} from "../components/ui/ErrorBanner.jsx"
import {AuthCard} from "../components/auth/AuthCard.jsx";
import {AuthInputField} from "../components/auth/AuthInputField.jsx";
import {getFormFieldClass} from "../utils/getFormFieldClass.js";
import {AuthSubmitButton} from "../components/auth/AuthSubmitButton.jsx";

export const ForgotPasswordPage = () => {

    const form = useForm({
        resolver: zodResolver(forgotPasswordSchema),
        mode: "onChange",
        defaultValues: { email: "" },
    })

    const {handleSubmit, register, reset, formState: { errors, isSubmitting, isValid }} = form

    const [forgotPassword, { isLoading, isSuccess, isError, error }] = useForgotPasswordMutation()

    const onSubmit = async (data) => {
        await forgotPassword({ email: data.email }).unwrap()
        reset()
    };

    return (
        <AuthCard title="Восстановление пароля">
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
                <AuthInputField
                    type="email"
                    autoComplete="email"
                    placeholder="Email"
                    className={getFormFieldClass(form, "email")}
                    registration={register("email")}
                    error={errors.email}
                />

                <AuthSubmitButton
                    disabled={!isValid || isSubmitting || isLoading}
                    isLoading={isLoading}
                    loadingLabel="Отправляем..."
                >
                    Отправить
                </AuthSubmitButton>
            </form>
            <p>
                <Link to="/login" className="line">
                    К входу
                </Link>
            </p>
        </AuthCard>
    );
};
