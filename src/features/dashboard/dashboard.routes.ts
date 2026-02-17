import { Router, type Router as RouterType } from 'express';
import * as dashboardController from './dashboard.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router: RouterType = Router();

// All dashboard routes require authentication
router.use(authenticate);

router.get('/summary', dashboardController.getSummary);

export default router;
