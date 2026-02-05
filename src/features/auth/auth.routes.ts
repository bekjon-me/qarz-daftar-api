import { Router, type Router as RouterType } from 'express';
import * as authController from './auth.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router: RouterType = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/otp/send', authController.sendOtp);
router.post('/otp/verify', authController.verifyOtp);
router.post('/google', authController.googleSignIn);
router.get('/profile', authenticate, authController.getProfile);
router.patch('/profile/name', authenticate, authController.updateName);
router.patch('/profile/phone', authenticate, authController.updatePhone);

export default router;
