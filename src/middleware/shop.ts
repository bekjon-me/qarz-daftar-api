import { Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { AuthRequest } from '../types/index.js';
import { ApiError } from '../utils/api-error.js';

/**
 * Reads X-Shop-Id header, validates user membership, and sets req.shop.
 * Must be used AFTER authenticate middleware.
 */
export function resolveShop(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): void {
  const shopId = req.headers['x-shop-id'] as string | undefined;

  if (!shopId) {
    throw ApiError.badRequest("'X-Shop-Id' sarlavhasi majburiy");
  }

  const userId = req.user!.userId;

  prisma.shopMember
    .findUnique({
      where: { userId_shopId: { userId, shopId } },
    })
    .then((member) => {
      if (!member) {
        throw ApiError.forbidden("Sizda bu do'konga kirish huquqi yo'q");
      }

      req.shop = { shopId, role: member.role };
      next();
    })
    .catch(next);
}

/**
 * Checks that the user has OWNER role on the current shop.
 * Must be used AFTER resolveShop middleware.
 */
export function requireOwner(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): void {
  if (req.shop?.role !== 'OWNER') {
    throw ApiError.forbidden("Bu amalni faqat do'kon egasi bajarishi mumkin");
  }

  next();
}
