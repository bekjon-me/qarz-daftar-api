import { z } from 'zod';

export const createTransactionSchema = z.object({
  customerId: z.string().uuid('Yaroqsiz mijoz ID formati'),
  type: z.enum(['DEBT', 'PAYMENT'], {
    error: "Turi 'DEBT' yoki 'PAYMENT' bo'lishi kerak",
  }),
  amount: z
    .number({ error: "Summa raqam bo'lishi kerak" })
    .int("Summa butun son bo'lishi kerak")
    .min(100, "Summa kamida 100 so'm bo'lishi kerak")
    .max(1_000_000_000, "Summa 1 milliard so'mdan oshmasligi kerak"),
  note: z
    .string()
    .max(500, 'Izoh 500 ta belgidan oshmasligi kerak')
    .transform((val) => val.trim())
    .optional(),
  expectedReturnDate: z
    .string()
    .datetime({ offset: true, message: "Noto'g'ri sana formati" })
    .optional(),
});

export const transactionListSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const customerTransactionsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const customerIdParamSchema = z.object({
  customerId: z.string().uuid('Yaroqsiz mijoz ID formati'),
});

export const transactionIdParamSchema = z.object({
  id: z.string().uuid('Yaroqsiz tranzaksiya ID formati'),
});

/** Inferred types from schemas */
export type CreateTransactionInput = z.output<typeof createTransactionSchema>;
export type TransactionListInput = z.output<typeof transactionListSchema>;
export type CustomerTransactionsInput = z.output<
  typeof customerTransactionsSchema
>;
export type CustomerIdParamInput = z.output<typeof customerIdParamSchema>;
export type TransactionIdParamInput = z.output<typeof transactionIdParamSchema>;
