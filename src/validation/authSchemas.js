import * as z from "zod"

const passwordRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

export const loginSchema = z.object({
    email: z.email("Должен содержать символ @ и домен (например, gmail.com)"),
    password: z.string().min(1, "Должно быть заполнено")
}).required()

export const registerSchema = z.object({
    username: z.string().min(1, "Должно быть заполнено"),
    email: z.email(" Должен содержать символ @ и домен (например, gmail.com)"),
    password: z.string().regex(passwordRule,
        {error: "Минимум 8 символов. Должен содержать: заглавную и строчную буквы, цифру"}),
    confirmPassword: z.string(),
}).required().refine((data) => data.password === data.confirmPassword, {
    message: "Пароли должны совпадать",
    path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
    email: z.email("Должен содержать символ @ и домен (например, gmail.com)"),
}).required()

export const resetPasswordSchema = z.object({
    password: z.string().regex(passwordRule, {
        error: "Минимум 8 символов. Должен содержать: заглавную и строчную буквы, цифру",
    }),
    confirmPassword: z.string(),
}).required().refine((data) => data.password === data.confirmPassword, {
    message: "Пароли должны совпадать",
    path: ["confirmPassword"],
})

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "Должно быть заполнено"),
    newPassword: z.string().regex(passwordRule, {
        error: "Минимум 8 символов. Должен содержать: заглавную и строчную буквы, цифру",
    }),
    confirmNewPassword: z.string(),
}).required().refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Пароли должны совпадать",
    path: ["confirmNewPassword"],
})

export const updateUsernameSchema = z.object({
    newUsername: z.string().min(1, "Должно быть заполнено"),
}).required()