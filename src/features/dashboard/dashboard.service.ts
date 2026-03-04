import { prisma } from '../../config/database.js';

interface DashboardSummary {
  totalDebt: number;
  totalPayment: number;
  balance: number;
  customerCount: number;
}

export async function getSummary(shopId: string): Promise<DashboardSummary> {
  const [debtAgg, paymentAgg, customerCount] = await Promise.all([
    prisma.transaction.aggregate({
      where: { shopId, type: 'DEBT' },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { shopId, type: 'PAYMENT' },
      _sum: { amount: true },
    }),
    prisma.customer.count({ where: { shopId } }),
  ]);

  const totalDebt = debtAgg._sum.amount ?? 0;
  const totalPayment = paymentAgg._sum.amount ?? 0;

  return {
    totalDebt,
    totalPayment,
    balance: totalDebt - totalPayment,
    customerCount,
  };
}
