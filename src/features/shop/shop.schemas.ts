import { z } from 'zod';

export const createShopSchema = z.object({
  name: z
    .string({ error: "Do'kon nomi majburiy" })
    .trim()
    .min(2, "Do'kon nomi kamida 2 ta belgidan iborat bo'lishi kerak")
    .max(100, "Do'kon nomi 100 ta belgidan oshmasligi kerak"),
});

export const updateShopSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Do'kon nomi kamida 2 ta belgidan iborat bo'lishi kerak")
    .max(100, "Do'kon nomi 100 ta belgidan oshmasligi kerak"),
});

export const shopIdSchema = z.object({
  id: z.string().uuid('Yaroqsiz ID formati'),
});

export const inviteAssistantSchema = z.object({
  phone: z
    .string({ error: 'Telefon raqam majburiy' })
    .transform((val) => val.replace(/[\s\-()]/g, ''))
    .pipe(
      z
        .string()
        .regex(
          /^\+998\d{9}$/,
          "Telefon raqam +998XXXXXXXXX formatida bo'lishi kerak",
        ),
    ),
});

export const memberIdSchema = z.object({
  id: z.string().uuid('Yaroqsiz ID formati'),
  memberId: z.string().uuid('Yaroqsiz ID formati'),
});

export type CreateShopInput = z.output<typeof createShopSchema>;
export type UpdateShopInput = z.output<typeof updateShopSchema>;
export type InviteAssistantInput = z.output<typeof inviteAssistantSchema>;
