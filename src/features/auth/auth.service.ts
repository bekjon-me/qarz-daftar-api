import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/api-error.js';
import * as otpService from '../../services/otp.service.js';
import type {
  RegisterInput,
  LoginInput,
  GoogleSignInInput,
} from './auth.schemas.js';

function generateToken(userId: string): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign({ userId }, env.JWT_SECRET, options);
}

const userSelect = {
  id: true,
  name: true,
  phone: true,
  createdAt: true,
} as const;

export async function register(input: RegisterInput) {
  const existingUser = await prisma.user.findUnique({
    where: { phone: input.phone },
  });

  if (existingUser) {
    throw ApiError.badRequest("Bu telefon raqam allaqachon ro'yxatdan o'tgan");
  }

  const hashedPassword = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      phone: input.phone,
      password: hashedPassword,
    },
    select: userSelect,
  });

  const token = generateToken(user.id);
  return { user, token };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { phone: input.phone },
  });

  if (!user || !user.password) {
    throw ApiError.unauthorized("Telefon raqam yoki parol noto'g'ri");
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.password);

  if (!isPasswordValid) {
    throw ApiError.unauthorized("Telefon raqam yoki parol noto'g'ri");
  }

  const token = generateToken(user.id);

  return {
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      createdAt: user.createdAt,
    },
    token,
  };
}

export async function sendOtp(phone: string) {
  // Phone is already validated and normalized by zod schema
  await otpService.generateAndSend(phone);
  return { phone };
}

export async function verifyOtp(phone: string, code: string) {
  // Phone and code are already validated by zod schema
  await otpService.verify(phone, code);

  let user = await prisma.user.findUnique({
    where: { phone },
    select: userSelect,
  });

  let isNewUser = false;

  if (!user) {
    user = await prisma.user.create({
      data: { phone, name: 'Hurmatli mijoz' },
      select: userSelect,
    });
    isNewUser = true;
  } else {
    // Check if existing user still needs onboarding (has default name)
    // This handles users who signed up but didn't complete onboarding
    isNewUser = user.name === 'Hurmatli mijoz';
  }

  const token = generateToken(user.id);
  return { user, token, isNewUser };
}

export async function googleSignIn(
  input: Omit<GoogleSignInInput, 'recaptchaToken'>,
) {
  const { googleId, name } = input;
  const idToken = input.idToken || input.accessToken;

  if (!idToken) {
    throw ApiError.badRequest('Google ID token kiritilishi shart');
  }

  // Verify the ID token with Google
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );

  if (!res.ok) {
    throw ApiError.unauthorized('Google token yaroqsiz');
  }

  const tokenInfo = (await res.json()) as {
    sub?: string;
    aud?: string;
    email?: string;
  };

  // Verify the token belongs to the claimed user (sub = subject = user ID)
  if (tokenInfo.sub !== googleId) {
    throw ApiError.unauthorized('Google token yaroqsiz');
  }

  // Verify the token was issued for our app (audience check)
  if (env.GOOGLE_CLIENT_ID && tokenInfo.aud !== env.GOOGLE_CLIENT_ID) {
    throw ApiError.unauthorized('Google token yaroqsiz');
  }

  let user = await prisma.user.findUnique({
    where: { googleId },
    select: { ...userSelect, googleId: true },
  });

  let isNewUser = false;

  if (!user) {
    // Create a placeholder phone using googleId (will be updated later if user adds phone)
    user = await prisma.user.create({
      data: {
        name: name || 'Hurmatli mijoz',
        phone: `google_${googleId}`,
        googleId,
      },
      select: { ...userSelect, googleId: true },
    });
    isNewUser = true;
  } else {
    // Check if existing user still needs onboarding (has placeholder phone)
    // This handles users who signed up but didn't complete onboarding
    isNewUser = user.phone.startsWith('google_');
  }

  const token = generateToken(user.id);
  return {
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      createdAt: user.createdAt,
    },
    token,
    isNewUser,
  };
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect,
  });

  if (!user) {
    throw ApiError.notFound('Foydalanuvchi topilmadi');
  }

  return user;
}

export async function updateName(userId: string, name: string) {
  // Name is already validated and trimmed by zod schema
  const user = await prisma.user.update({
    where: { id: userId },
    data: { name },
    select: userSelect,
  });

  return user;
}

/**
 * Update phone number for authenticated user (for Google users).
 * No OTP verification needed since user is already authenticated via Google.
 */
export async function updatePhone(userId: string, phone: string) {
  // Phone is already validated and normalized by zod schema

  // Check if this phone is already used by another user
  const existingUser = await prisma.user.findUnique({
    where: { phone },
  });

  if (existingUser && existingUser.id !== userId) {
    throw ApiError.badRequest(
      'Bu telefon raqam boshqa foydalanuvchi tomonidan ishlatilmoqda',
    );
  }

  // Update user's phone
  const user = await prisma.user.update({
    where: { id: userId },
    data: { phone },
    select: userSelect,
  });

  return user;
}
