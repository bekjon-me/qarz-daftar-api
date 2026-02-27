import { z } from 'zod';

export const notificationListSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const notificationIdParamSchema = z.object({
  id: z.string().uuid('Yaroqsiz bildirishnoma ID formati'),
});

export type NotificationListInput = z.output<typeof notificationListSchema>;
export type NotificationIdParam = z.output<typeof notificationIdParamSchema>;
