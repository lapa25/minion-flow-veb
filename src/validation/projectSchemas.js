import { z } from "zod";

export const projectUpsertSchema = z.object({
    name: z.string().trim()
        .min(3, "Название должно быть не короче 3 символов")
        .max(200, "Название должно быть не длиннее 200 символов"),
    description: z.string().trim()
        .max(1000, "Описание должно быть не длиннее 1000 символов")
        .optional()
        .or(z.literal("")),
});

export const inviteSchema = z.object({
    username: z.string().trim().min(1, "Укажите username"),
    memberRole: z.enum(["MAINTAINER", "USER"], {
        error: () => ({ message: "Можно назначить только роль мейнтейнера или пользователя" }),
    }),
});