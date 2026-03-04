import { Request } from 'express';
import { ShopRole } from '@prisma/client';

export interface AuthPayload {
  userId: string;
}

export interface ShopContext {
  shopId: string;
  role: ShopRole;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
  shop?: ShopContext;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}
