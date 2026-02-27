/**
 * Telegram Bot Service
 *
 * Sends notifications via Telegram Bot API and handles
 * incoming webhook updates for user linking.
 *
 * Linking flow:
 * 1. API generates a unique link code for a user
 * 2. User opens t.me/BotName?start=<code>
 * 3. Bot receives /start <code> via webhook
 * 4. We map the code → userId and save the chatId
 *
 * @see https://core.telegram.org/bots/api
 */

import { env } from '../config/env.js';
import { prisma } from '../config/database.js';
import crypto from 'node:crypto';

const TELEGRAM_API = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`;

// In-memory store for pending link codes (code → userId)
// Codes expire after 10 minutes.
const pendingLinks = new Map<string, { userId: string; expiresAt: number }>();

// ─── Sending Messages ─────────────────────────────────────────────────

/**
 * Send a text message to a Telegram chat.
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
): Promise<boolean> {
  if (!env.TELEGRAM_BOT_TOKEN) {
    console.warn('[Telegram] Bot token sozlanmagan');
    return false;
  }

  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[Telegram] Xabar yuborishda xatolik: ${error}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Telegram] Xabar yuborishda xatolik:', error);
    return false;
  }
}

// ─── User Linking ─────────────────────────────────────────────────────

/**
 * Generate a unique link code for a user.
 * Returns the deep link URL: https://t.me/BotName?start=<code>
 */
export async function generateTelegramLink(
  userId: string,
): Promise<string | null> {
  if (!env.TELEGRAM_BOT_TOKEN) {
    return null;
  }

  // Get bot username for the deep link
  const botUsername = await getBotUsername();
  if (!botUsername) return null;

  // Generate a random code
  const code = crypto.randomBytes(16).toString('hex');

  // Store with 10-minute expiry
  pendingLinks.set(code, {
    userId,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  // Clean up expired codes
  cleanExpiredLinks();

  return `https://t.me/${botUsername}?start=${code}`;
}

/**
 * Handle an incoming Telegram webhook update.
 * Processes /start commands for user linking.
 */
export async function handleTelegramWebhook(
  update: TelegramUpdate,
): Promise<void> {
  const message = update.message;
  if (!message?.text || !message.chat) return;

  const chatId = message.chat.id.toString();
  const text = message.text.trim();

  // Handle /start <code> for linking
  if (text.startsWith('/start ')) {
    const code = text.slice(7).trim();
    await handleStartCommand(chatId, code);
    return;
  }

  // Handle /start without code
  if (text === '/start') {
    await sendTelegramMessage(
      chatId,
      'Assalomu alaykum! 👋\n\n' +
        'Men <b>Qarz Daftar</b> ilovasining botiman.\n' +
        "Ilovadan bog'lanish havolasini oling va shu yerga yuboring.",
    );
    return;
  }

  // Handle /unlink
  if (text === '/unlink') {
    await handleUnlinkCommand(chatId);
    return;
  }

  // Handle /list — show overdue debts
  if (text === '/list') {
    await handleListCommand(chatId);
    return;
  }
}

/**
 * Unlink a user's Telegram account by chatId.
 */
export async function unlinkTelegram(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramChatId: true },
  });

  if (user?.telegramChatId) {
    await sendTelegramMessage(
      user.telegramChatId,
      'Telegram hisobingiz Qarz Daftar ilovasidan uzildi. ❌\n' +
        "Qayta bog'lanish uchun ilovadagi havoladan foydalaning.",
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: { telegramChatId: null },
  });
}

/**
 * Check if Telegram is configured (bot token exists).
 */
export function isTelegramConfigured(): boolean {
  return Boolean(env.TELEGRAM_BOT_TOKEN);
}

/**
 * Set the webhook URL for the Telegram bot.
 * Should be called once during server startup or manually.
 */
export async function setTelegramWebhook(webhookUrl: string): Promise<boolean> {
  if (!env.TELEGRAM_BOT_TOKEN) return false;

  try {
    const response = await fetch(`${TELEGRAM_API}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl }),
    });

    const result = (await response.json()) as {
      ok: boolean;
      description?: string;
    };

    if (!result.ok) {
      console.error(
        `[Telegram] Webhook o'rnatishda xatolik: ${result.description}`,
      );
      return false;
    }

    console.log(`[Telegram] Webhook o'rnatildi: ${webhookUrl}`);
    return true;
  } catch (error) {
    console.error("[Telegram] Webhook o'rnatishda xatolik:", error);
    return false;
  }
}

// ─── Internal Helpers ─────────────────────────────────────────────────

async function handleStartCommand(chatId: string, code: string): Promise<void> {
  const pending = pendingLinks.get(code);

  if (!pending || pending.expiresAt < Date.now()) {
    pendingLinks.delete(code);
    await sendTelegramMessage(
      chatId,
      'Bu havola eskirgan yoki yaroqsiz. ❌\n' +
        'Iltimos, ilovadan yangi havola oling.',
    );
    return;
  }

  // Link the Telegram chat to the user
  await prisma.user.update({
    where: { id: pending.userId },
    data: { telegramChatId: chatId },
  });

  pendingLinks.delete(code);

  await sendTelegramMessage(
    chatId,
    "Telegram hisobingiz Qarz Daftar ilovasiga muvaffaqiyatli bog'landi! ✅\n\n" +
      "Endi to'lov muddati kelganda sizga xabar yuboriladi.\n" +
      "Bog'lanishni bekor qilish uchun /unlink buyrug'ini yuboring.",
  );
}

async function handleUnlinkCommand(chatId: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { telegramChatId: chatId },
    select: { id: true },
  });

  if (!user) {
    await sendTelegramMessage(
      chatId,
      "Sizning Telegram hisobingiz hech qanday akkauntga bog'lanmagan.",
    );
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { telegramChatId: null },
  });

  await sendTelegramMessage(
    chatId,
    'Telegram hisobingiz Qarz Daftar ilovasidan muvaffaqiyatli uzildi. ✅\n' +
      "Qayta bog'lanish uchun ilovadagi havoladan foydalaning.",
  );
}

async function handleListCommand(chatId: string): Promise<void> {
  // Find the user linked to this chatId
  const user = await prisma.user.findFirst({
    where: { telegramChatId: chatId },
    select: { id: true },
  });

  if (!user) {
    await sendTelegramMessage(
      chatId,
      "Sizning Telegram hisobingiz hech qanday akkauntga bog'lanmagan.",
    );
    return;
  }

  const { getOverdueItems, buildTelegramMessage } =
    await import('./scheduler.service.js');

  const items = await getOverdueItems(user.id);
  const message = buildTelegramMessage(items);
  await sendTelegramMessage(chatId, message);
}

let cachedBotUsername: string | null = null;

async function getBotUsername(): Promise<string | null> {
  if (cachedBotUsername) return cachedBotUsername;
  if (!env.TELEGRAM_BOT_TOKEN) return null;

  try {
    const response = await fetch(`${TELEGRAM_API}/getMe`);
    const result = (await response.json()) as {
      ok: boolean;
      result?: { username: string };
    };

    if (result.ok && result.result?.username) {
      cachedBotUsername = result.result.username;
      return cachedBotUsername;
    }

    console.error("[Telegram] Bot ma'lumotlarini olishda xatolik");
    return null;
  } catch (error) {
    console.error('[Telegram] getMe xatolik:', error);
    return null;
  }
}

function cleanExpiredLinks(): void {
  const now = Date.now();
  for (const [code, link] of pendingLinks.entries()) {
    if (link.expiresAt < now) {
      pendingLinks.delete(code);
    }
  }
}

// ─── Types ────────────────────────────────────────────────────────────

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: {
      id: number;
      type: string;
    };
    text?: string;
    from?: {
      id: number;
      first_name?: string;
      username?: string;
    };
  };
}

export type { TelegramUpdate };
