import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/api-error.js';
import type {
  CreateShopInput,
  UpdateShopInput,
  InviteAssistantInput,
} from './shop.schemas.js';

export async function create(userId: string, input: CreateShopInput) {
  // Check free plan limit
  const ownedCount = await prisma.shopMember.count({
    where: { userId, role: 'OWNER' },
  });

  if (ownedCount >= env.MAX_OWNED_SHOPS) {
    throw ApiError.forbidden(
      `Bepul ta'rifda faqat ${env.MAX_OWNED_SHOPS} ta do'kon yaratish mumkin`,
    );
  }

  const shop = await prisma.shop.create({
    data: {
      name: input.name,
      members: {
        create: {
          userId,
          role: 'OWNER',
        },
      },
    },
    include: {
      members: {
        where: { userId },
        select: { role: true },
      },
    },
  });

  return {
    id: shop.id,
    name: shop.name,
    role: shop.members[0].role,
    createdAt: shop.createdAt,
  };
}

export async function getByUser(userId: string) {
  const memberships = await prisma.shopMember.findMany({
    where: { userId },
    include: {
      shop: {
        select: {
          id: true,
          name: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return memberships.map((m) => ({
    id: m.shop.id,
    name: m.shop.name,
    role: m.role,
    createdAt: m.shop.createdAt,
  }));
}

export async function getById(shopId: string) {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, phone: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!shop) {
    throw ApiError.notFound("Do'kon topilmadi");
  }

  return {
    id: shop.id,
    name: shop.name,
    createdAt: shop.createdAt,
    members: shop.members.map((m) => ({
      id: m.id,
      userId: m.user.id,
      name: m.user.name,
      phone: m.user.phone,
      role: m.role,
      createdAt: m.createdAt,
    })),
  };
}

export async function update(shopId: string, input: UpdateShopInput) {
  const shop = await prisma.shop.update({
    where: { id: shopId },
    data: { name: input.name },
  });

  return {
    id: shop.id,
    name: shop.name,
    createdAt: shop.createdAt,
  };
}

export async function inviteAssistant(
  userId: string,
  shopId: string,
  input: InviteAssistantInput,
) {
  // Check assistant limit
  const assistantCount = await prisma.shopMember.count({
    where: { shopId, role: 'ASSISTANT' },
  });

  if (assistantCount >= env.MAX_ASSISTANTS_PER_SHOP) {
    throw ApiError.forbidden(
      `Bepul ta'rifda har bir do'konga faqat ${env.MAX_ASSISTANTS_PER_SHOP} ta yordamchi qo'shish mumkin`,
    );
  }

  // Find user by phone, or create a stub if they haven't registered yet
  let targetUser = await prisma.user.findUnique({
    where: { phone: input.phone },
  });

  if (!targetUser) {
    targetUser = await prisma.user.create({
      data: { phone: input.phone, name: 'Hurmatli mijoz' },
    });
  }

  // Can't invite yourself
  if (targetUser.id === userId) {
    throw ApiError.badRequest("O'zingizni taklif qila olmaysiz");
  }

  // Check if already a member
  const existing = await prisma.shopMember.findUnique({
    where: { userId_shopId: { userId: targetUser.id, shopId } },
  });

  if (existing) {
    throw ApiError.badRequest("Bu foydalanuvchi allaqachon do'kon a'zosi");
  }

  const member = await prisma.shopMember.create({
    data: {
      userId: targetUser.id,
      shopId,
      role: 'ASSISTANT',
    },
    include: {
      user: {
        select: { id: true, name: true, phone: true },
      },
    },
  });

  return {
    id: member.id,
    userId: member.user.id,
    name: member.user.name,
    phone: member.user.phone,
    role: member.role,
    createdAt: member.createdAt,
  };
}

export async function removeMember(
  userId: string,
  shopId: string,
  memberId: string,
) {
  const member = await prisma.shopMember.findFirst({
    where: { id: memberId, shopId },
  });

  if (!member) {
    throw ApiError.notFound("A'zo topilmadi");
  }

  // Can't remove yourself (owner)
  if (member.userId === userId) {
    throw ApiError.badRequest("O'zingizni olib tashlay olmaysiz");
  }

  // Can't remove another owner
  if (member.role === 'OWNER') {
    throw ApiError.forbidden("Do'kon egasini olib tashlash mumkin emas");
  }

  await prisma.shopMember.delete({
    where: { id: memberId },
  });
}

export async function getMembers(shopId: string) {
  const members = await prisma.shopMember.findMany({
    where: { shopId },
    include: {
      user: {
        select: { id: true, name: true, phone: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return members.map((m) => ({
    id: m.id,
    userId: m.user.id,
    name: m.user.name,
    phone: m.user.phone,
    role: m.role,
    createdAt: m.createdAt,
  }));
}

/**
 * Get user's invitations — shops where the user is a member
 * but did NOT create (is not OWNER). Used during onboarding.
 */
export async function getInvitations(userId: string) {
  const memberships = await prisma.shopMember.findMany({
    where: { userId, role: 'ASSISTANT' },
    include: {
      shop: {
        select: {
          id: true,
          name: true,
          members: {
            where: { role: 'OWNER' },
            include: {
              user: { select: { name: true } },
            },
            take: 1,
          },
        },
      },
    },
  });

  return memberships.map((m) => ({
    shopId: m.shop.id,
    shopName: m.shop.name,
    ownerName: m.shop.members[0]?.user.name || "Noma'lum",
    memberId: m.id,
  }));
}
