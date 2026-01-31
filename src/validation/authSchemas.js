import * as z from "zod"

export const loginSchema = z.object({
    email: z.email("Должен содержать символ @ и домен (например, gmail.com)"),
    password: z.string().min(1)
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