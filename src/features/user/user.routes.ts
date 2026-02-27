import { Router, type Router as RouterType } from 'express';
import * as userController from './user.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { pushTokenSchema } from './user.schemas.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

// Push notification token management
router.post(
  '/push-token',
  validate(pushTokenSchema),
  userController.savePushToken,
);
router.delete('/push-token', userController.removePushToken);

// Telegram linking
router.get('/telegram-link', userController.getTelegramLink);
router.delete('/telegram-link', userController.unlinkTelegram);

// Notification settings
router.get('/notification-settings', userController.getNotificationSettings);

export default router;
