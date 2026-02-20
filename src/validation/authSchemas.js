import * as z from "zod"

export const loginSchema = z.object({
    email: z.email("Должен содержать символ @ и домен (например, gmail.com)"),
    password: z.string().min(1, "Должно быть заполнено")
}).required()

export const registerSchema = z.object({
    login: z.string().min(1, "Должно быть заполнено"),
    email: z.email(" Должен содержать символ @ и домен (например, gmail.com)"),
    password: z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
        {error: "Минимум 8 символов. Должен содержать: заглавную и строчную буквы, цифру"}),
    confirmPassword: z.string(),
}).required().refine((data) => data.password === data.confirmPassword, {
    message: "Пароли должны совпадать",
    path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
    email: z.email("Должен содержать символ @ и домен (например, gmail.com)"),
}).required()

export const confirmEmailCodeSchema = z.object({
    email: z.email("Должен содержать символ @ и домен (например, gmail.com)"),
    code: z.string()
           .min(4, "Код должен быть 4–6 цифр")
           .max(6, "Код должен быть 4–6 цифр")
           .regex(/^\d+$/, "Код должен состоять только из цифр"),
    }).required();

export const resendConfirmEmailSchema = z.object({
        email: z.email("Должен содержать символ @ и домен (например, gmail.com)"),
    }).required();

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "Должно быть заполнено"),
    newPassword: z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
        {error: "Минимум 8 символов. Должен содержать: заглавную и строчную буквы, цифру"}),
    confirmNewPassword: z.string(),
}).required().refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Пароли должны совпадать",
    path: ["confirmNewPassword"],
});