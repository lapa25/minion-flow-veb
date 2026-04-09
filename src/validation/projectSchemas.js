import { z } from "zod";

export const projectUpsertSchema = z.object({
    name: z.string().trim()
        .min(2, "Название должно быть не короче 2 символов")
        .max(64, "Название должно быть не длиннее 64 символов"),
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