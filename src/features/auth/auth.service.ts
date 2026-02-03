import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/api-error.js';

interface RegisterInput {
  name: string;
  phone: string;
  password: string;
}

interface LoginInput {
  phone: string;
  password: string;
}

function generateToken(userId: string): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign({ userId }, env.JWT_SECRET, options);
}

export async function register(input: RegisterInput) {
  const existingUser = await prisma.user.findUnique({
    where: { phone: input.phone },
  });

  if (existingUser) {
    throw ApiError.badRequest('User with this phone number already exists');
  }

  const hashedPassword = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      phone: input.phone,
      password: hashedPassword,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      createdAt: true,
    },
  });

  const token = generateToken(user.id);

  return { user, token };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { phone: input.phone },
  });

  if (!user) {
    throw ApiError.unauthorized('Invalid phone number or password');
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.password);

  if (!isPasswordValid) {
    throw ApiError.unauthorized('Invalid phone number or password');
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

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      phone: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  return user;
}
