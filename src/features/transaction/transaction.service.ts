import { prisma } from '../../config/database.js';
import { ApiError } from '../../utils/api-error.js';
import type {
  CreateTransactionInput,
  TransactionListInput,
  CustomerTransactionsInput,
} from './transaction.schemas.js';

const transactionSelect = {
  id: true,
  customerId: true,
  type: true,
  amount: true,
  note: true,
  createdAt: true,
  customer: {
    select: {
      name: true,
    },
  },
} as const;

export async function create(userId: string, input: CreateTransactionInput) {
  // Verify customer belongs to user
  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, userId },
    select: { id: true },
  });

  if (!customer) {
    throw ApiError.notFound('Mijoz topilmadi');
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      customerId: input.customerId,
      type: input.type,
      amount: input.amount,
      note: input.note || null,
    },
    select: transactionSelect,
  });

  return {
    id: transaction.id,
    customerId: transaction.customerId,
    customerName: transaction.customer.name,
    type: transaction.type,
    amount: transaction.amount,
    note: transaction.note,
    createdAt: transaction.createdAt,
  };
}

export async function listRecent(userId: string, input: TransactionListInput) {
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    select: transactionSelect,
    orderBy: { createdAt: 'desc' },
    take: input.limit,
  });

  return transactions.map((t) => ({
    id: t.id,
    customerId: t.customerId,
    customerName: t.customer.name,
    type: t.type,
    amount: t.amount,
    note: t.note,
    createdAt: t.createdAt,
  }));
}

export async function remove(userId: string, transactionId: string) {
  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, userId },
    select: { id: true },
  });

  if (!transaction) {
    throw ApiError.notFound('Tranzaksiya topilmadi');
  }

  await prisma.transaction.delete({
    where: { id: transactionId },
  });
}

export async function listByCustomer(
  userId: string,
  customerId: string,
  input: CustomerTransactionsInput,
) {
  // Verify customer belongs to user
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, userId },
    select: { id: true },
  });

  if (!customer) {
    throw ApiError.notFound('Mijoz topilmadi');
  }

  const { page, limit } = input;
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where: { customerId, userId },
      select: {
        id: true,
        customerId: true,
        type: true,
        amount: true,
        note: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.transaction.count({ where: { customerId, userId } }),
  ]);

  return {
    transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
