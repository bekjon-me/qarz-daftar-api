import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/api-error.js';
import { env } from '../config/env.js';
import { ApiResponse } from '../types/index.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response<ApiResponse>,
  _next: NextFunction,
): void {
  // Known application errors
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors.length > 0 ? err.errors : undefined,
    });
    return;
  }

  // Prisma known request errors (e.g., unique constraint violations)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[]) ?? [];
      res.status(409).json({
        success: false,
        message: `Bu ${target.join(', ')} allaqachon mavjud`,
      });
      return;
    }

    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: "Ma'lumot topilmadi",
      });
      return;
    }

    console.error(
      `[Prisma Error] ${req.method} ${req.originalUrl} - ${err.code}:`,
      err.message,
    );
    res.status(400).json({
      success: false,
      message: "Ma'lumotlar bazasi xatosi",
    });
    return;
  }

  // Prisma validation errors (invalid query arguments)
  if (err instanceof Prisma.PrismaClientValidationError) {
    console.error(
      `[Prisma Validation] ${req.method} ${req.originalUrl}:`,
      err.message,
    );
    res.status(400).json({
      success: false,
      message: "Noto'g'ri so'rov",
    });
    return;
  }

  // JSON parse errors (malformed request body)
  if (err instanceof SyntaxError && 'status' in err && err.status === 400) {
    res.status(400).json({
      success: false,
      message: "JSON formati noto'g'ri",
    });
    return;
  }

  // Unhandled errors
  console.error(
    `[Unhandled Error] ${req.method} ${req.originalUrl}:`,
    err.stack || err,
  );

  res.status(500).json({
    success: false,
    message:
      env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
}
