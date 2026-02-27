import { prisma } from '../../config/database.js';
import {
  generateTelegramLink,
  unlinkTelegram as unlinkTelegramService,
  isTelegramConfigured,
} from '../../services/telegram.service.js';
import type { PushTokenInput } from './user.schemas.js';

/**
 * Save or update the user's Expo push token.
 */
export async function savePushToken(
  userId: string,
  input: PushTokenInput,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { expoPushToken: input.token },
  });
}

/**
 * Remove the user's Expo push token (e.g., on logout).
 */
export async function removePushToken(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { expoPushToken: null },
  });
}

/**
 * Get Telegram deep link URL for user linking.
 */
export async function getTelegramLink(
  userId: string,
): Promise<{ url: string | null; isLinked: boolean; isConfigured: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramChatId: true },
  });

  const isLinked = Boolean(user?.telegramChatId);
  const isConfigured = isTelegramConfigured();

  if (isLinked) {
    return { url: null, isLinked: true, isConfigured };
  }

  const url = await generateTelegramLink(userId);
  return { url, isLinked: false, isConfigured };
}

/**
 * Unlink Telegram from user account.
 */
export async function unlinkTelegram(userId: string): Promise<void> {
  await unlinkTelegramService(userId);
}

/**
 * Get user's notification settings (push token status, telegram link status).
 */
export async function getNotificationSettings(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      expoPushToken: true,
      telegramChatId: true,
    },
  });

  return {
    pushEnabled: Boolean(user?.expoPushToken),
    telegramLinked: Boolean(user?.telegramChatId),
    telegramConfigured: isTelegramConfigured(),
  };
}
