import { z } from 'zod';

/**
 * Shared phone schema — optional, but if provided must be valid.
 */
const phoneSchema = z
  .string()
  .transform((val) => val.replace(/\D/g, ''))
  .pipe(
    z
      .string()
      .refine(
        (digits) => {
          if (digits.length === 0) return true; // allow empty
          if (digits.length === 9) return true;
          if (digits.length === 12 && digits.startsWith('998')) return true;
          return false;
        },
        { message: "Telefon raqam noto'g'ri formatda" },
      )
      .transform((digits) => {
        if (digits.length === 0) return '';
        const fullDigits = digits.length === 9 ? `998${digits}` : digits;
        return `+${fullDigits}`;
      }),
  )
  .optional();

export const createCustomerSchema = z.object({
  name: z
    .string({ error: 'Mijoz ismi kiritilishi shart' })
    .min(2, "Ism kamida 2 ta harfdan iborat bo'lishi kerak")
    .max(100, 'Ism 100 ta harfdan oshmasligi kerak')
    .transform((val) => val.trim()),
  phone: phoneSchema,
  note: z
    .string()
    .max(500, 'Izoh 500 ta belgidan oshmasligi kerak')
    .transform((val) => val.trim())
    .optional(),
});

export const updateCustomerSchema = z.object({
  name: z
    .string()
    .min(2, "Ism kamida 2 ta harfdan iborat bo'lishi kerak")
    .max(100, 'Ism 100 ta harfdan oshmasligi kerak')
    .transform((val) => val.trim())
    .optional(),
  phone: phoneSchema,
  note: z
    .string()
    .max(500, 'Izoh 500 ta belgidan oshmasligi kerak')
    .transform((val) => val.trim())
    .optional(),
});

export const customerIdSchema = z.object({
  id: z.string().uuid('Yaroqsiz ID formati'),
});

export const customerListSchema = z.object({
  search: z.string().optional(),
  hasDebt: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** Inferred types from schemas */
export type CreateCustomerInput = z.output<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.output<typeof updateCustomerSchema>;
export type CustomerIdInput = z.output<typeof customerIdSchema>;
export type CustomerListInput = z.output<typeof customerListSchema>;
