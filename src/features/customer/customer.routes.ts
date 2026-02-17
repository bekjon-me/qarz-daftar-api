import { Router, type Router as RouterType } from 'express';
import * as customerController from './customer.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  createCustomerSchema,
  updateCustomerSchema,
} from './customer.schemas.js';

const router: RouterType = Router();

// All customer routes require authentication
router.use(authenticate);

router.post('/', validate(createCustomerSchema), customerController.create);
router.get('/', customerController.list);
router.get('/:id', customerController.getById);
router.patch('/:id', validate(updateCustomerSchema), customerController.update);
router.delete('/:id', customerController.remove);

export default router;
