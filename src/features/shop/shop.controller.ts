import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/index.js';
import * as shopService from './shop.service.js';
import {
  createShopSchema,
  updateShopSchema,
  inviteAssistantSchema,
  memberIdSchema,
} from './shop.schemas.js';

export async function create(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.userId;
    const input = createShopSchema.parse(req.body);
    const shop = await shopService.create(userId, input);

    res.status(201).json({ success: true, data: shop });
  } catch (error) {
    next(error);
  }
}

export async function getMyShops(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.userId;
    const shops = await shopService.getByUser(userId);

    res.json({ success: true, data: shops });
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
    const shopId = req.shop!.shopId;
    const shop = await shopService.getById(shopId);

    res.json({ success: true, data: shop });
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
    const shopId = req.shop!.shopId;
    const input = updateShopSchema.parse(req.body);
    const shop = await shopService.update(shopId, input);

    res.json({ success: true, data: shop });
  } catch (error) {
    next(error);
  }
}

export async function getMembers(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const shopId = req.shop!.shopId;
    const members = await shopService.getMembers(shopId);

    res.json({ success: true, data: members });
  } catch (error) {
    next(error);
  }
}

export async function inviteAssistant(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.userId;
    const shopId = req.shop!.shopId;
    const input = inviteAssistantSchema.parse(req.body);
    const member = await shopService.inviteAssistant(userId, shopId, input);

    res.status(201).json({ success: true, data: member });
  } catch (error) {
    next(error);
  }
}

export async function removeMember(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.userId;
    const shopId = req.shop!.shopId;
    const { memberId } = memberIdSchema.parse(req.params);
    await shopService.removeMember(userId, shopId, memberId);

    res.json({ success: true, message: "A'zo olib tashlandi" });
  } catch (error) {
    next(error);
  }
}

export async function getInvitations(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.userId;
    const invitations = await shopService.getInvitations(userId);

    res.json({ success: true, data: invitations });
  } catch (error) {
    next(error);
  }
}
