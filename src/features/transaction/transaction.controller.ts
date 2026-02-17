import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/index.js';
import * as transactionService from './transaction.service.js';
import {
  transactionListSchema,
  customerTransactionsSchema,
  customerIdParamSchema,
  transactionIdParamSchema,
} from './transaction.schemas.js';

export async function create(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const transaction = await transactionService.create(
      req.user!.userId,
      req.body,
    );

    res.status(201).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
}

export async function listRecent(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const query = transactionListSchema.parse(req.query);
    const transactions = await transactionService.listRecent(
      req.user!.userId,
      query,
    );

    res.json({
      success: true,
      data: transactions,
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
    const { id } = transactionIdParamSchema.parse(req.params);
    await transactionService.remove(req.user!.userId, id);

    res.json({
      success: true,
      message: "Tranzaksiya o'chirildi",
    });
  } catch (error) {
    next(error);
  }
}

export async function listByCustomer(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { customerId } = customerIdParamSchema.parse(req.params);
    const query = customerTransactionsSchema.parse(req.query);
    const result = await transactionService.listByCustomer(
      req.user!.userId,
      customerId,
      query,
    );

    res.json({
      success: true,
      data: result.transactions,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}
