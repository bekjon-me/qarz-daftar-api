import { Router, type Router as RouterType } from 'express';
import * as authController from './auth.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  registerSchema,
  loginSchema,
  sendOtpSchema,
  verifyOtpSchema,
  googleSignInSchema,
  updateNameSchema,
  updatePhoneSchema,
} from './auth.schemas.js';

const router: RouterType = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/otp/send', validate(sendOtpSchema), authController.sendOtp);
router.post('/otp/verify', validate(verifyOtpSchema), authController.verifyOtp);
router.post(
  '/google',
  validate(googleSignInSchema),
  authController.googleSignIn,
);
router.get('/profile', authenticate, authController.getProfile);
router.patch(
  '/profile/name',
  authenticate,
  validate(updateNameSchema),
  authController.updateName,
);
router.patch(
  '/profile/phone',
  authenticate,
  validate(updatePhoneSchema),
  authController.updatePhone,
);

export default router;
