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
  expectedReturnDate: true,
  createdAt: true,
  customer: {
    select: {
      name: true,
    },
  },
} as const;

export async function create(
  shopId: string,
  createdById: string,
  input: CreateTransactionInput,
) {
  // Verify customer belongs to shop
  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, shopId },
    select: { id: true },
  });

  if (!customer) {
    throw ApiError.notFound('Mijoz topilmadi');
  }

  const transaction = await prisma.transaction.create({
    data: {
      shopId,
      createdById,
      customerId: input.customerId,
      type: input.type,
      amount: input.amount,
      note: input.note || null,
      expectedReturnDate: input.expectedReturnDate
        ? new Date(input.expectedReturnDate)
        : null,
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
    expectedReturnDate: transaction.expectedReturnDate,
    createdAt: transaction.createdAt,
  };
}

export async function listRecent(shopId: string, input: TransactionListInput) {
  const transactions = await prisma.transaction.findMany({
    where: { shopId },
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
    expectedReturnDate: t.expectedReturnDate,
    createdAt: t.createdAt,
  }));
}

export async function remove(shopId: string, transactionId: string) {
  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, shopId },
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
  shopId: string,
  customerId: string,
  input: CustomerTransactionsInput,
) {
  // Verify customer belongs to shop
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, shopId },
    select: { id: true },
  });

  if (!customer) {
    throw ApiError.notFound('Mijoz topilmadi');
  }

  const { page, limit } = input;
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where: { customerId, shopId },
      select: {
        id: true,
        customerId: true,
        type: true,
        amount: true,
        note: true,
        expectedReturnDate: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.transaction.count({ where: { customerId, shopId } }),
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
