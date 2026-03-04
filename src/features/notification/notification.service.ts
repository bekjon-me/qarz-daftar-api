import { prisma } from '../../config/database.js';
import { ApiError } from '../../utils/api-error.js';
import type { NotificationListInput } from './notification.schemas.js';

const notificationSelect = {
  id: true,
  type: true,
  title: true,
  message: true,
  isRead: true,
  customerId: true,
  transactionId: true,
  createdAt: true,
  customer: {
    select: {
      name: true,
      phone: true,
    },
  },
  transaction: {
    select: {
      amount: true,
      expectedReturnDate: true,
    },
  },
} as const;

/**
 * Auto-generate PAYMENT_DUE notifications for transactions
 * where expectedReturnDate is today or past and no notification
 * has been created yet for that transaction.
 */
export async function generatePaymentDueNotifications(
  userId: string,
  shopId: string,
) {
  const now = new Date();
  // End of today (to catch all transactions due today)
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );

  // Find DEBT transactions with expectedReturnDate <= today
  // that don't already have a notification
  const dueTransactions = await prisma.transaction.findMany({
    where: {
      shopId,
      type: 'DEBT',
      expectedReturnDate: {
        lte: endOfToday,
        not: null,
      },
      notification: null, // No notification created yet
    },
    select: {
      id: true,
      customerId: true,
      amount: true,
      expectedReturnDate: true,
      customer: {
        select: {
          name: true,
        },
      },
    },
  });

  if (dueTransactions.length === 0) return;

  // Create notifications for each due transaction
  const notifications = dueTransactions.map((tx) => ({
    userId,
    shopId,
    type: 'PAYMENT_DUE' as const,
    title: "To'lov muddati keldi",
    message: `${tx.customer.name} bugun ${formatAmount(tx.amount)} so'm qaytarishi kerak`,
    customerId: tx.customerId,
    transactionId: tx.id,
  }));

  await prisma.notification.createMany({
    data: notifications,
    skipDuplicates: true,
  });
}

/**
 * Get all notifications for a user, newest first.
 * Also triggers auto-generation of payment_due notifications.
 */
export async function list(
  userId: string,
  shopId: string,
  input: NotificationListInput,
) {
  // Auto-generate payment due notifications before listing
  await generatePaymentDueNotifications(userId, shopId);

  const notifications = await prisma.notification.findMany({
    where: { userId, shopId },
    select: notificationSelect,
    orderBy: { createdAt: 'desc' },
    take: input.limit,
  });

  return notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    isRead: n.isRead,
    customerId: n.customerId,
    customerName: n.customer?.name ?? null,
    customerPhone: n.customer?.phone ?? null,
    transactionId: n.transactionId,
    transactionAmount: n.transaction?.amount ?? null,
    expectedReturnDate: n.transaction?.expectedReturnDate ?? null,
    createdAt: n.createdAt,
  }));
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(
  userId: string,
  shopId: string,
  notificationId: string,
) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId, shopId },
    select: { id: true },
  });

  if (!notification) {
    throw ApiError.notFound('Bildirishnoma topilmadi');
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllAsRead(userId: string, shopId: string) {
  await prisma.notification.updateMany({
    where: { userId, shopId, isRead: false },
    data: { isRead: true },
  });
}

/**
 * Delete all notifications for a user.
 */
export async function clearAll(userId: string, shopId: string) {
  await prisma.notification.deleteMany({
    where: { userId, shopId },
  });
}

/**
 * Get count of unread notifications.
 */
export async function getUnreadCount(userId: string, shopId: string) {
  // Also trigger auto-generation before counting
  await generatePaymentDueNotifications(userId, shopId);

  const count = await prisma.notification.count({
    where: { userId, shopId, isRead: false },
  });

  return count;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function formatAmount(amount: number): string {
  return Math.abs(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
