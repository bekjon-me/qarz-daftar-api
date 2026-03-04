import { Router, type Router as RouterType } from 'express';
import * as notificationController from './notification.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { resolveShop } from '../../middleware/shop.js';

const router: RouterType = Router();

// All notification routes require authentication
router.use(authenticate);

// GET /api/notifications — list all notifications
router.get('/', resolveShop, notificationController.list);

// GET /api/notifications/unread-count — get unread count
router.get('/unread-count', resolveShop, notificationController.getUnreadCount);

// PATCH /api/notifications/:id/read — mark one as read
router.patch('/:id/read', resolveShop, notificationController.markAsRead);

// PATCH /api/notifications/read-all — mark all as read
router.patch('/read-all', resolveShop, notificationController.markAllAsRead);

// DELETE /api/notifications — clear all notifications
router.delete('/', resolveShop, notificationController.clearAll);

// POST /api/notifications/trigger — manually trigger notification check
router.post('/trigger', notificationController.trigger);

export default router;
