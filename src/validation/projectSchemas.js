import { z } from "zod";

export const projectUpsertSchema = z.object({
    name: z.string().trim()
        .min(2, "Название должно быть не короче 2 символов")
        .max(64, "Название должно быть не длиннее 64 символов"),
    description: z.string().trim()
        .max(1000, "Описание должно быть не длиннее 1000 символов")
        .optional()
        .or(z.literal("")),
    is_active: z.boolean().optional(),
});

export const inviteSchema = z.object({
    email: z.email("Должен содержать символ @ и домен (например, gmail.com)"),
    role: z.enum(["maintainer", "user"], {
        error: () => ({ message: "Можно назначить только роль мейнтейнера или пользователя" }),
    }),
});