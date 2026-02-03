import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service.js';
import { AuthRequest } from '../../types/index.js';

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
