import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/api-error.js';
import { env } from '../config/env.js';
import { ApiResponse } from '../types/index.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response<ApiResponse>,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors.length > 0 ? err.errors : undefined,
    });
    return;
  }

  console.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    message:
      env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
}
