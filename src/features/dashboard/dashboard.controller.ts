import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/index.js';
import * as dashboardService from './dashboard.service.js';

export async function getSummary(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const summary = await dashboardService.getSummary(req.user!.userId);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
}
