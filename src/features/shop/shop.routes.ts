import { Router, type Router as RouterType } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { resolveShop, requireOwner } from '../../middleware/shop.js';
import * as shopController from './shop.controller.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

// Shop CRUD
router.post('/', shopController.create);
router.get('/my', shopController.getMyShops);
router.get('/invitations', shopController.getInvitations);

// Routes that require a shop context (X-Shop-Id header)
router.get('/:id', resolveShop, shopController.getById);
router.patch('/:id', resolveShop, requireOwner, shopController.update);

// Member management (requires shop context + owner role)
router.get('/:id/members', resolveShop, shopController.getMembers);
router.post(
  '/:id/invite',
  resolveShop,
  requireOwner,
  shopController.inviteAssistant,
);
router.delete(
  '/:id/members/:memberId',
  resolveShop,
  requireOwner,
  shopController.removeMember,
);

export default router;
