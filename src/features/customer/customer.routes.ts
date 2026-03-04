import { Router, type Router as RouterType } from 'express';
import * as customerController from './customer.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { resolveShop, requireOwner } from '../../middleware/shop.js';
import { validate } from '../../middleware/validate.js';
import {
  createCustomerSchema,
  updateCustomerSchema,
} from './customer.schemas.js';

const router: RouterType = Router();

// All customer routes require authentication + shop context
router.use(authenticate, resolveShop);

router.post('/', validate(createCustomerSchema), customerController.create);
router.get('/', customerController.list);
router.get('/:id', customerController.getById);
router.patch('/:id', validate(updateCustomerSchema), customerController.update);
router.delete('/:id', requireOwner, customerController.remove);

export default router;
