/**
 * Scheduler Service
 *
 * Runs a daily cron job at 9:00 AM Tashkent time (04:00 UTC)
 * to scan all users for overdue DEBT transactions and:
 * 1. Create notification records in the database
 * 2. Send push notifications via Expo
 * 3. Send Telegram messages to linked users
 */

import cron from 'node-cron';
import { env } from '../config/env.js';
import { prisma } from '../config/database.js';
import { sendPushNotificationBatch } from './push.service.js';
import {
  sendTelegramMessage,
  isTelegramConfigured,
} from './telegram.service.js';

/**
 * Start the notification scheduler.
 * Runs daily at 04:00 UTC (9:00 AM UZT).
 */
export function startScheduler(): void {
  const schedule = env.CRON_SCHEDULE;

  cron.schedule(schedule, async () => {
    console.log('[Scheduler] Kundalik bildirishnoma tekshiruvi boshlandi...');

    try {
      await processAllUsersNotifications();
      console.log('[Scheduler] Kundalik tekshiruv yakunlandi.');
    } catch (error) {
      console.error('[Scheduler] Tekshiruvda xatolik:', error);
    }
  });

  console.log(`[Scheduler] Bildirishnoma rejasi o'rnatildi (${schedule})`);
}

/**
 * Process overdue notifications for ALL users.
 * Called by the cron job.
 */
export async function processAllUsersNotifications(): Promise<void> {
  const now = new Date();
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );

  // Find ALL DEBT transactions across ALL users where:
  // - expectedReturnDate <= today
  // - No notification has been created yet for that transaction
  const dueTransactions = await prisma.transaction.findMany({
    where: {
      type: 'DEBT',
      expectedReturnDate: {
        lte: endOfToday,
        not: null,
      },
      notification: null,
    },
    select: {
      id: true,
      userId: true,
      customerId: true,
      amount: true,
      expectedReturnDate: true,
      customer: {
        select: {
          name: true,
          phone: true,
        },
      },
      user: {
        select: {
          id: true,
          expoPushToken: true,
          telegramChatId: true,
        },
      },
    },
  });

  if (dueTransactions.length === 0) {
    console.log("[Scheduler] Muddati o'tgan tranzaksiyalar topilmadi.");
    return;
  }

  console.log(
    `[Scheduler] ${dueTransactions.length} ta muddati o'tgan tranzaksiya topildi.`,
  );

  // 1. Create notification records in DB
  const notificationData = dueTransactions.map((tx) => ({
    userId: tx.userId,
    type: 'PAYMENT_DUE' as const,
    title: "To'lov muddati keldi",
    message: `${tx.customer.name} bugun ${formatAmount(tx.amount)} so'm qaytarishi kerak`,
    customerId: tx.customerId,
    transactionId: tx.id,
  }));

  await prisma.notification.createMany({
    data: notificationData,
    skipDuplicates: true,
  });

  // 2. Send push notifications (batch by user)
  const pushMessages: Array<{
    token: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }> = [];

  for (const tx of dueTransactions) {
    if (tx.user.expoPushToken) {
      pushMessages.push({
        token: tx.user.expoPushToken,
        title: "To'lov muddati keldi",
        body: `${tx.customer.name} bugun ${formatAmount(tx.amount)} so'm qaytarishi kerak`,
        data: {
          type: 'PAYMENT_DUE',
          customerId: tx.customerId,
          transactionId: tx.id,
        },
      });
    }
  }

  if (pushMessages.length > 0) {
    console.log(
      `[Scheduler] ${pushMessages.length} ta push bildirishnoma yuborilmoqda...`,
    );
    await sendPushNotificationBatch(pushMessages);
  }

  // 3. Send Telegram messages (with full overdue summary per user)
  if (isTelegramConfigured()) {
    // Collect unique users with Telegram linked
    const telegramUsers = new Map<string, string>();
    for (const tx of dueTransactions) {
      if (tx.user.telegramChatId && !telegramUsers.has(tx.userId)) {
        telegramUsers.set(tx.userId, tx.user.telegramChatId);
      }
    }

    for (const [userId, chatId] of telegramUsers) {
      const items = await getOverdueItems(userId);
      const message = buildTelegramMessage(items);
      await sendTelegramMessage(chatId, message);
    }

    if (telegramUsers.size > 0) {
      console.log(
        `[Scheduler] ${telegramUsers.size} ta foydalanuvchiga Telegram xabar yuborildi.`,
      );
    }
  }
}

/**
 * Get overdue debt items for a specific user.
 * Queries ALL overdue DEBT transactions and filters out
 * customers whose net balance is 0 or positive (already paid back).
 */
export async function getOverdueItems(userId: string): Promise<
  Array<{
    customerName: string;
    customerPhone: string | null;
    amount: number;
    expectedReturnDate: Date;
  }>
> {
  const now = new Date();
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );

  // Get all customers with overdue DEBT transactions
  const customers = await prisma.customer.findMany({
    where: {
      userId,
      transactions: {
        some: {
          type: 'DEBT',
          expectedReturnDate: {
            lte: endOfToday,
            not: null,
          },
        },
      },
    },
    select: {
      name: true,
      phone: true,
      transactions: {
        select: {
          type: true,
          amount: true,
          expectedReturnDate: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  const items: Array<{
    customerName: string;
    customerPhone: string | null;
    amount: number;
    expectedReturnDate: Date;
  }> = [];

  for (const customer of customers) {
    // Calculate net balance: DEBT adds, PAYMENT subtracts
    const balance = customer.transactions.reduce((sum, tx) => {
      return tx.type === 'DEBT' ? sum + tx.amount : sum - tx.amount;
    }, 0);

    // Skip customers who already paid back (balance <= 0)
    if (balance <= 0) continue;

    // Find the earliest overdue expectedReturnDate for this customer
    const earliestOverdue = customer.transactions
      .filter(
        (tx) =>
          tx.type === 'DEBT' &&
          tx.expectedReturnDate &&
          tx.expectedReturnDate <= endOfToday,
      )
      .sort(
        (a, b) =>
          a.expectedReturnDate!.getTime() - b.expectedReturnDate!.getTime(),
      )[0];

    if (earliestOverdue) {
      items.push({
        customerName: customer.name,
        customerPhone: customer.phone,
        amount: balance,
        expectedReturnDate: earliestOverdue.expectedReturnDate!,
      });
    }
  }

  return items;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function formatAmount(amount: number): string {
  return Math.abs(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

const MAX_ITEMS_IN_MESSAGE = 5;

export function buildTelegramMessage(
  items: Array<{
    customerName: string;
    customerPhone: string | null;
    amount: number;
    expectedReturnDate: Date;
  }>,
): string {
  if (items.length === 0) {
    return "✅ Hozirda muddati o'tgan nasiyalar yo'q.";
  }

  // Sort by amount descending (highest risk first)
  const sorted = [...items].sort((a, b) => b.amount - a.amount);

  // Calculate summary stats
  const totalAmount = sorted.reduce((sum, item) => sum + item.amount, 0);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let critical = 0; // 10+ kun
  let warning = 0; // 1-9 kun
  let dueToday = 0; // bugun

  for (const item of sorted) {
    const due = new Date(
      item.expectedReturnDate.getFullYear(),
      item.expectedReturnDate.getMonth(),
      item.expectedReturnDate.getDate(),
    );
    const diffDays = Math.round(
      (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays >= 10) critical++;
    else if (diffDays >= 1) warning++;
    else dueToday++;
  }

  // Build summary header
  let msg = '📊 <b>Bugungi holat:</b>\n';
  msg += `   👥 ${sorted.length} ta mijoz qarzdor\n`;
  msg += `   💰 Jami: ${formatAmount(totalAmount)} so'm\n`;
  if (critical > 0) msg += `   🔴 10+ kun kechikkan: ${critical} ta\n`;
  if (warning > 0) msg += `   🟡 1-9 kun kechikkan: ${warning} ta\n`;
  if (dueToday > 0) msg += `   🟢 Bugun muddati: ${dueToday} ta\n`;

  // Top items
  const top = sorted.slice(0, MAX_ITEMS_IN_MESSAGE);
  msg += `\n📋 <b>Eng muhim nasiyalar:</b>\n\n`;

  const lines = top.map((item, i) => {
    let line = `${i + 1}. <b>${item.customerName}</b> — ${formatAmount(item.amount)} so'm`;

    if (item.customerPhone) {
      line += `\n   📞 ${item.customerPhone}`;
    }

    const dateStr = formatDate(item.expectedReturnDate);
    const overdue = getOverdueText(item.expectedReturnDate);
    line += `\n   📅 Muddati: ${dateStr} (${overdue})`;

    return line;
  });

  msg += lines.join('\n\n');

  // Remaining count
  const remaining = sorted.length - MAX_ITEMS_IN_MESSAGE;
  if (remaining > 0) {
    const remainingAmount = sorted
      .slice(MAX_ITEMS_IN_MESSAGE)
      .reduce((sum, item) => sum + item.amount, 0);
    msg += `\n\n... va yana <b>${remaining} ta</b> nasiya (${formatAmount(remainingAmount)} so'm)`;
  }

  msg += "\n\n💡 To'liq ro'yxat uchun Qarz Daftar ilovasini oching.";

  return msg;
}

function formatDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

function getOverdueText(expectedDate: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(
    expectedDate.getFullYear(),
    expectedDate.getMonth(),
    expectedDate.getDate(),
  );

  const diffMs = today.getTime() - due.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'bugun';
  if (diffDays === 1) return '1 kun kechikkan';
  return `${diffDays} kun kechikkan`;
}
