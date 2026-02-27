import { z } from 'zod';

export const pushTokenSchema = z.object({
  token: z
    .string({ error: "Token matn bo'lishi kerak" })
    .min(1, 'Token talab qilinadi'),
});

export type PushTokenInput = z.output<typeof pushTokenSchema>;
