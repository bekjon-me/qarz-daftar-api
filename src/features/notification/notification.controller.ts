import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/index.js';
import { env } from '../../config/env.js';
import * as notificationService from './notification.service.js';
import { processAllShopsNotifications } from '../../services/scheduler.service.js';
import { ApiError } from '../../utils/api-error.js';
import {
  notificationListSchema,
  notificationIdParamSchema,
} from './notification.schemas.js';

export async function list(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.userId;
    const shopId = req.shop!.shopId;
    const query = notificationListSchema.parse(req.query);
    const notifications = await notificationService.list(userId, shopId, query);
    res.json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
}

export async function markAsRead(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.userId;
    const shopId = req.shop!.shopId;
    const { id } = notificationIdParamSchema.parse(req.params);
    await notificationService.markAsRead(userId, shopId, id);
    res.json({ success: true, message: "Bildirishnoma o'qildi" });
  } catch (error) {
    next(error);
  }
}

export async function markAllAsRead(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.userId;
    const shopId = req.shop!.shopId;
    await notificationService.markAllAsRead(userId, shopId);
    res.json({
      success: true,
      message: "Barcha bildirishnomalar o'qildi",
    });
  } catch (error) {
    next(error);
  }
}

export async function clearAll(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.userId;
    const shopId = req.shop!.shopId;
    await notificationService.clearAll(userId, shopId);
    res.json({
      success: true,
      message: "Barcha bildirishnomalar o'chirildi",
    });
  } catch (error) {
    next(error);
  }
}

export async function getUnreadCount(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.userId;
    const shopId = req.shop!.shopId;
    const count = await notificationService.getUnreadCount(userId, shopId);
    res.json({ success: true, data: { count } });
  } catch (error) {
    next(error);
  }
}

export async function trigger(
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (env.NODE_ENV === 'production') {
      throw ApiError.forbidden(
        'Bu endpoint faqat ishlab chiqish muhitida ishlaydi',
      );
    }

    await processAllShopsNotifications();
    res.json({
      success: true,
      message: 'Bildirishnomalar tekshirildi va yuborildi',
    });
  } catch (error) {
    next(error);
  }
}
