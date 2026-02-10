import { z } from 'zod';

/**
 * Shared Uzbekistan phone number schema.
 * Accepts various formats: +998901234567, 998901234567, 901234567
 * Normalizes to +998XXXXXXXXX format.
 */
const uzbekPhoneSchema = z
  .string({ error: 'Telefon raqam kiritilishi shart' })
  .transform((val) => val.replace(/\D/g, ''))
  .pipe(
    z
      .string()
      .refine(
        (digits) => {
          // Accept 9 digits (without country code) or 12 digits (with 998)
          if (digits.length === 9) return true;
          if (digits.length === 12 && digits.startsWith('998')) return true;
          return false;
        },
        { message: "Telefon raqam noto'g'ri formatda. Masalan: +998901234567" },
      )
      .transform((digits) => {
        // Normalize: if 9 digits, prepend 998
        const fullDigits = digits.length === 9 ? `998${digits}` : digits;
        return `+${fullDigits}`;
      }),
  );

export const registerSchema = z.object({
  phone: uzbekPhoneSchema,
  password: z
    .string({ error: 'Parol kiritilishi shart' })
    .min(6, "Parol kamida 6 ta belgidan iborat bo'lishi kerak"),
  name: z
    .string()
    .min(2, "Ism kamida 2 ta harfdan iborat bo'lishi kerak")
    .max(50, 'Ism 50 ta harfdan oshmasligi kerak')
    .transform((val) => val.trim())
    .optional(),
});

export const loginSchema = z.object({
  phone: uzbekPhoneSchema,
  password: z
    .string({ error: 'Parol kiritilishi shart' })
    .min(1, 'Parol kiritilishi shart'),
});

export const sendOtpSchema = z.object({
  phone: uzbekPhoneSchema,
  recaptchaToken: z
    .string()
    .min(1, 'reCAPTCHA token kiritilishi shart')
    .optional(),
});

export const verifyOtpSchema = z.object({
  phone: uzbekPhoneSchema,
  code: z
    .string({ error: 'Tasdiqlash kodi kiritilishi shart' })
    .regex(/^\d{6}$/, "Tasdiqlash kodi 6 ta raqamdan iborat bo'lishi kerak"),
});

export const googleSignInSchema = z
  .object({
    idToken: z.string().optional(),
    accessToken: z.string().optional(),
    googleId: z
      .string({ error: 'Google ID kiritilishi shart' })
      .min(1, 'Google ID kiritilishi shart'),
    email: z.string().email().optional(),
    name: z.string().optional(),
    recaptchaToken: z
      .string({ error: 'reCAPTCHA token kiritilishi shart' })
      .min(1, 'reCAPTCHA token kiritilishi shart'),
  })
  .refine((data) => data.idToken || data.accessToken, {
    message: 'Google ID token kiritilishi shart',
    path: ['idToken'],
  });

export const updateNameSchema = z.object({
  name: z
    .string({ error: 'Ism kiritilishi shart' })
    .min(2, "Ism kamida 2 ta harfdan iborat bo'lishi kerak")
    .max(50, 'Ism 50 ta harfdan oshmasligi kerak')
    .transform((val) => val.trim()),
});

export const updatePhoneSchema = z.object({
  phone: uzbekPhoneSchema,
});

/** Inferred types from schemas */
export type RegisterInput = z.output<typeof registerSchema>;
export type LoginInput = z.output<typeof loginSchema>;
export type SendOtpInput = z.output<typeof sendOtpSchema>;
export type VerifyOtpInput = z.output<typeof verifyOtpSchema>;
export type GoogleSignInInput = z.output<typeof googleSignInSchema>;
export type UpdateNameInput = z.output<typeof updateNameSchema>;
export type UpdatePhoneInput = z.output<typeof updatePhoneSchema>;
