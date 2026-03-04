/**
 * Scheduler Service
 *
 * Runs a daily cron job at 9:00 AM Tashkent time (04:00 UTC)
 * to scan all shops for overdue DEBT transactions and:
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
      await processAllShopsNotifications();
      console.log('[Scheduler] Kundalik tekshiruv yakunlandi.');
    } catch (error) {
      console.error('[Scheduler] Tekshiruvda xatolik:', error);
    }
  });

  console.log(`[Scheduler] Bildirishnoma rejasi o'rnatildi (${schedule})`);
}

/**
 * Process overdue notifications for ALL shops.
 * Called by the cron job and the trigger endpoint.
 */
export async function processAllShopsNotifications(): Promise<void> {
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

  // Find ALL DEBT transactions across ALL shops where:
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
      shopId: true,
      customerId: true,
      amount: true,
      expectedReturnDate: true,
      customer: {
        select: {
          name: true,
          phone: true,
        },
      },
      shop: {
        select: {
          id: true,
          members: {
            select: {
              userId: true,
              role: true,
              user: {
                select: {
                  id: true,
                  expoPushToken: true,
                  telegramChatId: true,
                },
              },
            },
          },
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

  // 1. Create notification records in DB — one per transaction per shop member (OWNER)
  // Notifications go to the shop OWNER(s)
  const notificationData: Array<{
    userId: string;
    shopId: string;
    type: 'PAYMENT_DUE';
    title: string;
    message: string;
    customerId: string;
    transactionId: string;
  }> = [];

  for (const tx of dueTransactions) {
    // Send notification to shop OWNERs only
    const owners = tx.shop.members.filter((m) => m.role === 'OWNER');
    for (const owner of owners) {
      notificationData.push({
        userId: owner.userId,
        shopId: tx.shopId,
        type: 'PAYMENT_DUE',
        title: "To'lov muddati keldi",
        message: `${tx.customer.name} bugun ${formatAmount(tx.amount)} so'm qaytarishi kerak`,
        customerId: tx.customerId,
        transactionId: tx.id,
      });
    }
  }

  if (notificationData.length > 0) {
    await prisma.notification.createMany({
      data: notificationData,
      skipDuplicates: true,
    });
  }

  // 2. Send push notifications (to all shop members with push tokens)
  const pushMessages: Array<{
    token: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }> = [];

  for (const tx of dueTransactions) {
    for (const member of tx.shop.members) {
      if (member.user.expoPushToken) {
        pushMessages.push({
          token: member.user.expoPushToken,
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
  }

  if (pushMessages.length > 0) {
    console.log(
      `[Scheduler] ${pushMessages.length} ta push bildirishnoma yuborilmoqda...`,
    );
    await sendPushNotificationBatch(pushMessages);
  }

  // 3. Send Telegram messages (to shop members with Telegram linked)
  if (isTelegramConfigured()) {
    // Group transactions by shopId for per-shop Telegram messages
    const shopTxMap = new Map<string, typeof dueTransactions>();
    for (const tx of dueTransactions) {
      const existing = shopTxMap.get(tx.shopId);
      if (existing) {
        existing.push(tx);
      } else {
        shopTxMap.set(tx.shopId, [tx]);
      }
    }

    let telegramCount = 0;

    for (const [shopId, shopTxs] of shopTxMap) {
      // Get overdue items for this shop
      const items = await getOverdueItems(shopId);
      const message = buildTelegramMessage(items);

      // Find all members with Telegram linked
      const allMembers = shopTxs.flatMap((tx) => tx.shop.members);
      const telegramMembers = new Map<string, string>();
      for (const member of allMembers) {
        if (member.user.telegramChatId && !telegramMembers.has(member.userId)) {
          telegramMembers.set(member.userId, member.user.telegramChatId);
        }
      }

      for (const [, chatId] of telegramMembers) {
        await sendTelegramMessage(chatId, message);
        telegramCount++;
      }
    }

    if (telegramCount > 0) {
      console.log(
        `[Scheduler] ${telegramCount} ta foydalanuvchiga Telegram xabar yuborildi.`,
      );
    }
  }
}

export interface OverdueItem {
  customerName: string;
  customerPhone: string | null;
  transactionAmount: number;
  expectedReturnDate: Date;
  daysOverdue: number;
}

/**
 * Get overdue debt items for a specific shop (per-transaction granularity).
 * Returns individual overdue DEBT transactions, but still skips
 * customers whose net balance is <= 0 (already paid back).
 */
export async function getOverdueItems(shopId: string): Promise<OverdueItem[]> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
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
      shopId,
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

  const items: OverdueItem[] = [];

  for (const customer of customers) {
    // Calculate net balance: DEBT adds, PAYMENT subtracts
    const balance = customer.transactions.reduce((sum, tx) => {
      return tx.type === 'DEBT' ? sum + tx.amount : sum - tx.amount;
    }, 0);

    // Skip customers who already paid back (balance <= 0)
    if (balance <= 0) continue;

    // Return individual overdue DEBT transactions for this customer
    const overdueTxs = customer.transactions.filter(
      (tx) =>
        tx.type === 'DEBT' &&
        tx.expectedReturnDate &&
        tx.expectedReturnDate <= endOfToday,
    );

    for (const tx of overdueTxs) {
      const due = new Date(
        tx.expectedReturnDate!.getFullYear(),
        tx.expectedReturnDate!.getMonth(),
        tx.expectedReturnDate!.getDate(),
      );
      const daysOverdue = Math.round(
        (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24),
      );

      items.push({
        customerName: customer.name,
        customerPhone: customer.phone,
        transactionAmount: tx.amount,
        expectedReturnDate: tx.expectedReturnDate!,
        daysOverdue,
      });
    }
  }

  // Sort by days overdue descending (most overdue first)
  items.sort((a, b) => b.daysOverdue - a.daysOverdue);

  return items;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function formatAmount(amount: number): string {
  return Math.abs(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

const MAX_CUSTOMERS_IN_MESSAGE = 5;

/**
 * Build a Telegram message from per-transaction overdue items,
 * grouped by customer name.
 */
export function buildTelegramMessage(items: OverdueItem[]): string {
  if (items.length === 0) {
    return "✅ Hozirda muddati o'tgan nasiyalar yo'q.";
  }

  // Group items by customer
  const grouped = new Map<
    string,
    { phone: string | null; transactions: OverdueItem[] }
  >();
  for (const item of items) {
    const existing = grouped.get(item.customerName);
    if (existing) {
      existing.transactions.push(item);
    } else {
      grouped.set(item.customerName, {
        phone: item.customerPhone,
        transactions: [item],
      });
    }
  }

  // Sort customers by max overdue days (most critical first)
  const sortedCustomers = [...grouped.entries()].sort((a, b) => {
    const aMax = Math.max(...a[1].transactions.map((t) => t.daysOverdue));
    const bMax = Math.max(...b[1].transactions.map((t) => t.daysOverdue));
    return bMax - aMax;
  });

  // Calculate summary stats
  const totalAmount = items.reduce(
    (sum, item) => sum + item.transactionAmount,
    0,
  );
  let critical = 0; // 10+ kun
  let warning = 0; // 1-9 kun
  let dueToday = 0; // bugun

  for (const item of items) {
    if (item.daysOverdue >= 10) critical++;
    else if (item.daysOverdue >= 1) warning++;
    else dueToday++;
  }

  // Build summary header
  let msg = '📊 <b>Bugungi holat:</b>\n';
  msg += `   📝 ${items.length} ta tranzaksiya, ${grouped.size} ta mijoz\n`;
  msg += `   💰 Jami: ${formatAmount(totalAmount)} so'm\n`;
  if (critical > 0) msg += `   🔴 10+ kun kechikkan: ${critical} ta\n`;
  if (warning > 0) msg += `   🟡 1-9 kun kechikkan: ${warning} ta\n`;
  if (dueToday > 0) msg += `   🟢 Bugun muddati: ${dueToday} ta\n`;

  // Customer details (top N)
  const topCustomers = sortedCustomers.slice(0, MAX_CUSTOMERS_IN_MESSAGE);
  msg += '\n';

  for (const [customerName, data] of topCustomers) {
    // Pick urgency emoji by max overdue days
    const maxOverdue = Math.max(...data.transactions.map((t) => t.daysOverdue));
    const emoji = maxOverdue >= 10 ? '🔴' : maxOverdue >= 1 ? '🟡' : '🟢';

    msg += `${emoji} <b>${customerName}</b>`;
    if (data.phone) msg += ` (${data.phone})`;
    msg += ':\n';

    // Sort transactions by overdue days desc within customer
    const sortedTxs = [...data.transactions].sort(
      (a, b) => b.daysOverdue - a.daysOverdue,
    );

    for (const tx of sortedTxs) {
      const overdue = getOverdueText(tx.expectedReturnDate);
      msg += `   • ${formatAmount(tx.transactionAmount)} so'm — ${overdue}\n`;
    }

    msg += '\n';
  }

  // Remaining customers
  const remaining = sortedCustomers.length - MAX_CUSTOMERS_IN_MESSAGE;
  if (remaining > 0) {
    const remainingTxCount = sortedCustomers
      .slice(MAX_CUSTOMERS_IN_MESSAGE)
      .reduce((sum, [, data]) => sum + data.transactions.length, 0);
    msg += `... va yana <b>${remaining} ta</b> mijoz (${remainingTxCount} ta tranzaksiya)\n`;
  }

  msg += "💡 To'liq ro'yxat uchun Qarz Daftar ilovasini oching.";

  return msg;
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
