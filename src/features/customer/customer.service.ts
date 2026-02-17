import { prisma } from '../../config/database.js';
import { ApiError } from '../../utils/api-error.js';
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerListInput,
} from './customer.schemas.js';

const customerSelect = {
  id: true,
  name: true,
  phone: true,
  note: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Compute balance for a single customer from their transactions.
 * Balance = sum(DEBT) - sum(PAYMENT). Positive means customer owes money.
 */
async function computeBalance(customerId: string): Promise<number> {
  const [debtAgg, paymentAgg] = await Promise.all([
    prisma.transaction.aggregate({
      where: { customerId, type: 'DEBT' },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { customerId, type: 'PAYMENT' },
      _sum: { amount: true },
    }),
  ]);

  const totalDebt = debtAgg._sum.amount ?? 0;
  const totalPayment = paymentAgg._sum.amount ?? 0;

  return totalDebt - totalPayment;
}

export async function create(userId: string, input: CreateCustomerInput) {
  const customer = await prisma.customer.create({
    data: {
      userId,
      name: input.name,
      phone: input.phone || null,
      note: input.note || null,
    },
    select: customerSelect,
  });

  return { ...customer, balance: 0 };
}

export async function list(userId: string, input: CustomerListInput) {
  const { search, hasDebt, page, limit } = input;
  const skip = (page - 1) * limit;

  const where = {
    userId,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      select: {
        ...customerSelect,
        transactions: {
          select: {
            type: true,
            amount: true,
          },
        },
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ]);

  // Compute balance from included transactions
  let customersWithBalance = customers.map((c) => {
    const balance = c.transactions.reduce((acc, t) => {
      return t.type === 'DEBT' ? acc + t.amount : acc - t.amount;
    }, 0);

    // Remove raw transactions from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { transactions: _txns, ...customerData } = c;
    return { ...customerData, balance };
  });

  // Apply post-query balance filter if requested
  if (hasDebt !== undefined) {
    customersWithBalance = customersWithBalance.filter((c) =>
      hasDebt ? c.balance > 0 : c.balance <= 0,
    );
  }

  return {
    customers: customersWithBalance,
    pagination: {
      page,
      limit,
      total: hasDebt !== undefined ? customersWithBalance.length : total,
      totalPages:
        hasDebt !== undefined
          ? Math.ceil(customersWithBalance.length / limit)
          : Math.ceil(total / limit),
    },
  };
}

export async function getById(userId: string, customerId: string) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, userId },
    select: customerSelect,
  });

  if (!customer) {
    throw ApiError.notFound('Mijoz topilmadi');
  }

  const balance = await computeBalance(customerId);

  return { ...customer, balance };
}

export async function update(
  userId: string,
  customerId: string,
  input: UpdateCustomerInput,
) {
  // Verify ownership
  const existing = await prisma.customer.findFirst({
    where: { id: customerId, userId },
  });

  if (!existing) {
    throw ApiError.notFound('Mijoz topilmadi');
  }

  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.phone !== undefined && {
        phone: input.phone || null,
      }),
      ...(input.note !== undefined && { note: input.note || null }),
    },
    select: customerSelect,
  });

  const balance = await computeBalance(customerId);

  return { ...customer, balance };
}

export async function remove(userId: string, customerId: string) {
  // Verify ownership
  const existing = await prisma.customer.findFirst({
    where: { id: customerId, userId },
  });

  if (!existing) {
    throw ApiError.notFound('Mijoz topilmadi');
  }

  await prisma.customer.delete({
    where: { id: customerId },
  });
}
