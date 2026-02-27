import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/index.js';
import * as userService from './user.service.js';

/**
 * POST /api/users/push-token
 * Register or update the user's Expo push token.
 */
export async function savePushToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    await userService.savePushToken(req.user!.userId, req.body);
    res.json({ success: true, message: 'Push token saqlandi' });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/users/push-token
 * Remove the user's Expo push token.
 */
export async function removePushToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    await userService.removePushToken(req.user!.userId);
    res.json({ success: true, message: "Push token o'chirildi" });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/users/telegram-link
 * Get Telegram deep link URL for linking.
 */
export async function getTelegramLink(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await userService.getTelegramLink(req.user!.userId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/users/telegram-link
 * Unlink Telegram from user account.
 */
export async function unlinkTelegram(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    await userService.unlinkTelegram(req.user!.userId);
    res.json({ success: true, message: "Telegram bog'lanish bekor qilindi" });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/users/notification-settings
 * Get user's notification delivery settings.
 */
export async function getNotificationSettings(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const settings = await userService.getNotificationSettings(
      req.user!.userId,
    );
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
}
