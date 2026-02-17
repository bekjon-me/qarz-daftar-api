import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/index.js';
import * as customerService from './customer.service.js';
import { customerIdSchema, customerListSchema } from './customer.schemas.js';

export async function create(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const customer = await customerService.create(req.user!.userId, req.body);

    res.status(201).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
}

export async function list(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const query = customerListSchema.parse(req.query);
    const result = await customerService.list(req.user!.userId, query);

    res.json({
      success: true,
      data: result.customers,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function getById(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = customerIdSchema.parse(req.params);
    const customer = await customerService.getById(req.user!.userId, id);

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
}

export async function update(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = customerIdSchema.parse(req.params);
    const customer = await customerService.update(
      req.user!.userId,
      id,
      req.body,
    );

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
}

export async function remove(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = customerIdSchema.parse(req.params);
    await customerService.remove(req.user!.userId, id);

    res.json({
      success: true,
      message: "Mijoz muvaffaqiyatli o'chirildi",
    });
  } catch (error) {
    next(error);
  }
}
