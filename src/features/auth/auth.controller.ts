import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service.js';
import { AuthRequest } from '../../types/index.js';
import { verifyRecaptcha } from '../../services/recaptcha.service.js';

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { name, phone, password } = req.body;
    const result = await authService.register({ name, phone, password });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone, password } = req.body;
    const result = await authService.login({ phone, password });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function sendOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone, recaptchaToken } = req.body;

    // Verify reCAPTCHA
    await verifyRecaptcha(recaptchaToken, 'sign_in');

    const result = await authService.sendOtp(phone);

    res.json({
      success: true,
      data: result,
      message: 'Tasdiqlash kodi yuborildi',
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyOtp(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { phone, code } = req.body;
    const result = await authService.verifyOtp(phone, code);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function googleSignIn(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    // Accept both idToken and accessToken for backward compatibility
    const { idToken, accessToken, googleId, email, name, recaptchaToken } =
      req.body;

    // Verify reCAPTCHA
    await verifyRecaptcha(recaptchaToken, 'sign_in');

    const result = await authService.googleSignIn({
      idToken: idToken || accessToken,
      googleId,
      email,
      name,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getProfile(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = await authService.getProfile(req.user!.userId);

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateName(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { name } = req.body;
    const user = await authService.updateName(req.user!.userId, name);

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

export async function updatePhone(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { phone } = req.body;
    const user = await authService.updatePhone(req.user!.userId, phone);

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}
