import { Router, type Router as RouterType } from 'express';
import * as authController from './auth.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router: RouterType = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/profile', authenticate, authController.getProfile);

export default router;
