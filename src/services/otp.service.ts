import crypto from 'node:crypto';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';
import { sendSms } from './eskiz.service.js';

const DEV_BYPASS_CODE = '000000';

function generateCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export async function generateAndSend(phone: string): Promise<void> {
  // In development, skip cooldown check and SMS sending
  if (env.NODE_ENV === 'development') {
    console.log(`[DEV] OTP for ${phone}: use ${DEV_BYPASS_CODE} to bypass`);
    return;
  }

  const recentOtp = await prisma.otp.findFirst({
    where: {
      phone,
      createdAt: {
        gte: new Date(Date.now() - env.OTP_COOLDOWN_SECONDS * 1000),
      },
    },
  });

  if (recentOtp) {
    throw ApiError.badRequest(
      `Iltimos, ${env.OTP_COOLDOWN_SECONDS} soniya kutib turing`,
    );
  }

  await prisma.otp.deleteMany({ where: { phone } });

  const code = generateCode();
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.otp.create({
    data: { phone, code, expiresAt },
  });

  await sendSms(phone, `Qarz Daftar: Tasdiqlash kodi: ${code}`);
}

export async function verify(phone: string, code: string): Promise<void> {
  // In development, allow bypass code
  if (env.NODE_ENV === 'development' && code === DEV_BYPASS_CODE) {
    console.log(`[DEV] OTP bypass used for ${phone}`);
    return;
  }

  const otp = await prisma.otp.findFirst({
    where: { phone, code, verified: false },
  });

  if (!otp) {
    throw ApiError.badRequest("Kod noto'g'ri");
  }

  if (otp.expiresAt < new Date()) {
    throw ApiError.badRequest('Kod muddati tugagan');
  }

  await prisma.otp.update({
    where: { id: otp.id },
    data: { verified: true },
  });
}
