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
  createdAt: true,
  customer: {
    select: {
      name: true,
      phone: true,
    },
  },
} as const;

/**
 * Auto-generate PAYMENT_DUE notifications for transactions
 * where expectedReturnDate is today or past and no notification
 * has been created yet for that transaction.
 */
export async function generatePaymentDueNotifications(userId: string) {
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
      userId,
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
export async function list(userId: string, input: NotificationListInput) {
  // Auto-generate payment due notifications before listing
  await generatePaymentDueNotifications(userId);

  const notifications = await prisma.notification.findMany({
    where: { userId },
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
    createdAt: n.createdAt,
  }));
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(userId: string, notificationId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
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
export async function markAllAsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

/**
 * Delete all notifications for a user.
 */
export async function clearAll(userId: string) {
  await prisma.notification.deleteMany({
    where: { userId },
  });
}

/**
 * Get count of unread notifications.
 */
export async function getUnreadCount(userId: string) {
  // Also trigger auto-generation before counting
  await generatePaymentDueNotifications(userId);

  const count = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  return count;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function formatAmount(amount: number): string {
  return Math.abs(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
