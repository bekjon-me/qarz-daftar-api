import { Request } from 'express';

export interface AuthPayload {
  userId: string;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}
