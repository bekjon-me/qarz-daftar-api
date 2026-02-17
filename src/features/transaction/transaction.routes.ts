import { Router, type Router as RouterType } from 'express';
import * as transactionController from './transaction.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { createTransactionSchema } from './transaction.schemas.js';

const router: RouterType = Router();

// All transaction routes require authentication
router.use(authenticate);

router.post(
  '/',
  validate(createTransactionSchema),
  transactionController.create,
);
router.get('/', transactionController.listRecent);
router.get('/customer/:customerId', transactionController.listByCustomer);
router.delete('/:id', transactionController.remove);

export default router;
