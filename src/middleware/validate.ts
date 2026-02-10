import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApiError } from '../utils/api-error.js';

/**
 * Express middleware factory that validates `req.body` against a Zod schema.
 * On success, replaces `req.body` with the parsed (and potentially transformed) data.
 * On failure, throws an `ApiError.badRequest` with structured validation errors.
 */
export function validate<T extends z.ZodType>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => {
        const path = issue.path.join('.');
        return path ? `${path}: ${issue.message}` : issue.message;
      });

      throw ApiError.badRequest("Ma'lumotlar noto'g'ri", errors);
    }

    req.body = result.data;
    next();
  };
}
