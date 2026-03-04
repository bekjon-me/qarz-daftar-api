/**
 * Prisma seed script — creates test shop, customers, and overdue DEBT transactions.
 *
 * Usage:
 *   pnpm seed                             # 5 default customers + overdue debts
 *   pnpm seed -- --count 10               # 10 customers + overdue debts
 *   pnpm seed -- --phone +998908702909    # seed a specific user by phone
 *   pnpm seed -- --phone +998908702909 --count 3
 *
 * What it does:
 *   1. Finds the target user (first user, or by --phone flag)
 *   2. Creates/finds the user's shop (or creates one)
 *   3. Creates N test customers with Uzbek names and phone numbers
 *   4. Creates overdue DEBT transactions with various due dates
 *   5. Optionally creates an assistant user + membership
 */

import { prisma } from '../src/config/database.js';

// ─── Default test customers ──────────────────────────────────────────

const DEFAULT_CUSTOMERS = [
  { name: 'Abdulloh Karimov', phone: '+998901001010' },
  { name: 'Dilshod Rahimov', phone: '+998902002020' },
  { name: 'Gulnora Azimova', phone: '+998903003030' },
  { name: 'Jasur Toshmatov', phone: '+998904004040' },
  { name: 'Kamola Umarova', phone: '+998905005050' },
  { name: 'Laziz Botirov', phone: '+998906006060' },
  { name: 'Malika Sharipova', phone: '+998907007070' },
  { name: 'Nodir Saidov', phone: '+998908008080' },
  { name: 'Ozoda Mirzayeva', phone: '+998909009090' },
  { name: 'Rustam Xolmatov', phone: '+998911101010' },
  { name: 'Sarvar Nurmatov', phone: '+998912202020' },
  { name: 'Toxir Haydarov', phone: '+998913303030' },
  { name: 'Ulugbek Jurayev', phone: '+998914404040' },
  { name: 'Feruza Qodirova', phone: '+998915505050' },
  { name: 'Xurshid Aliyev', phone: '+998916606060' },
];

// ─── Overdue transaction templates ──────────────────────────────────

const OVERDUE_TEMPLATES = [
  { daysOverdue: 30, amount: 5_000_000, note: 'Seed: 30 kun kechikkan' },
  { daysOverdue: 14, amount: 2_500_000, note: 'Seed: 14 kun kechikkan' },
  { daysOverdue: 7, amount: 1_000_000, note: 'Seed: 7 kun kechikkan' },
  { daysOverdue: 3, amount: 500_000, note: 'Seed: 3 kun kechikkan' },
  { daysOverdue: 1, amount: 200_000, note: 'Seed: 1 kun kechikkan' },
  { daysOverdue: 0, amount: 800_000, note: 'Seed: bugun muddati' },
  { daysOverdue: 21, amount: 3_000_000, note: 'Seed: 21 kun kechikkan' },
  { daysOverdue: 5, amount: 350_000, note: 'Seed: 5 kun kechikkan' },
  { daysOverdue: 10, amount: 1_500_000, note: 'Seed: 10 kun kechikkan' },
  { daysOverdue: 2, amount: 150_000, note: 'Seed: 2 kun kechikkan' },
  { daysOverdue: 45, amount: 7_000_000, note: 'Seed: 45 kun kechikkan' },
  { daysOverdue: 0, amount: 400_000, note: 'Seed: bugun muddati (2)' },
  { daysOverdue: 8, amount: 900_000, note: 'Seed: 8 kun kechikkan' },
  { daysOverdue: 15, amount: 1_200_000, note: 'Seed: 15 kun kechikkan' },
  { daysOverdue: 60, amount: 10_000_000, note: 'Seed: 60 kun kechikkan' },
];

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  const phoneArg = getCliArg('--phone');
  const countArg = getCliArg('--count');
  const count = countArg ? parseInt(countArg, 10) : 5;

  if (isNaN(count) || count < 1 || count > DEFAULT_CUSTOMERS.length) {
    console.error(
      `❌ --count 1 dan ${DEFAULT_CUSTOMERS.length} gacha bo'lishi kerak.`,
    );
    process.exit(1);
  }

  // Find the target user
  const user = phoneArg
    ? await prisma.user.findUnique({
        where: { phone: phoneArg },
        select: { id: true, name: true, phone: true },
      })
    : await prisma.user.findFirst({
        select: { id: true, name: true, phone: true },
        orderBy: { createdAt: 'asc' },
      });

  if (!user) {
    console.error('❌ Foydalanuvchi topilmadi.');
    process.exit(1);
  }

  console.log(`👤 Foydalanuvchi: ${user.name} (${user.phone})`);

  // Find or create the user's shop
  let shopMembership = await prisma.shopMember.findFirst({
    where: { userId: user.id, role: 'OWNER' },
    include: { shop: true },
  });

  if (!shopMembership) {
    const shopName = `${user.name} do'koni`;
    console.log(`🏪 Do'kon yaratilmoqda: ${shopName}`);
    const shop = await prisma.shop.create({
      data: {
        name: shopName,
        members: {
          create: {
            userId: user.id,
            role: 'OWNER',
          },
        },
      },
    });
    shopMembership = await prisma.shopMember.findFirst({
      where: { userId: user.id, shopId: shop.id },
      include: { shop: true },
    });
  } else {
    console.log(`🏪 Do'kon: ${shopMembership.shop.name}`);
  }

  const shopId = shopMembership!.shopId;

  // Create assistant user (if not exists)
  const assistantPhone = '+998901234567';
  let assistant = await prisma.user.findUnique({
    where: { phone: assistantPhone },
  });

  if (!assistant) {
    assistant = await prisma.user.create({
      data: {
        name: 'Yordamchi Ali',
        phone: assistantPhone,
      },
    });
    console.log(`👷 Yordamchi yaratildi: ${assistant.name} (${assistant.phone})`);
  }

  // Add assistant to shop if not already a member
  const existingAssistant = await prisma.shopMember.findUnique({
    where: { userId_shopId: { userId: assistant.id, shopId } },
  });

  if (!existingAssistant) {
    await prisma.shopMember.create({
      data: {
        userId: assistant.id,
        shopId,
        role: 'ASSISTANT',
      },
    });
    console.log(`✅ Yordamchi do'konga qo'shildi`);
  }

  console.log(`📦 ${count} ta mijoz yaratiladi...\n`);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let customersCreated = 0;
  let customersSkipped = 0;
  let transactionsCreated = 0;
  let transactionsSkipped = 0;

  for (let i = 0; i < count; i++) {
    const template = DEFAULT_CUSTOMERS[i];
    const overdueTemplate = OVERDUE_TEMPLATES[i];

    // Create or find customer (now scoped to shop, not user)
    let customer = await prisma.customer.findFirst({
      where: {
        shopId,
        phone: template.phone,
      },
      select: { id: true, name: true, phone: true },
    });

    if (customer) {
      console.log(`⏭️  Mijoz: ${customer.name} — allaqachon mavjud`);
      customersSkipped++;
    } else {
      customer = await prisma.customer.create({
        data: {
          shopId,
          name: template.name,
          phone: template.phone,
        },
        select: { id: true, name: true, phone: true },
      });
      console.log(`✅ Mijoz: ${customer.name} (${customer.phone})`);
      customersCreated++;
    }

    // Create overdue DEBT transaction
    const existing = await prisma.transaction.findFirst({
      where: {
        shopId,
        customerId: customer.id,
        note: overdueTemplate.note,
      },
    });

    if (existing) {
      console.log(
        `   ⏭️  Tranzaksiya allaqachon mavjud, o'tkazib yuborildi`,
      );
      transactionsSkipped++;
      continue;
    }

    const expectedReturnDate = new Date(today);
    expectedReturnDate.setDate(
      expectedReturnDate.getDate() - overdueTemplate.daysOverdue,
    );

    await prisma.transaction.create({
      data: {
        shopId,
        createdById: user.id,
        customerId: customer.id,
        type: 'DEBT',
        amount: overdueTemplate.amount,
        note: overdueTemplate.note,
        expectedReturnDate,
      },
    });

    const overdueLabel =
      overdueTemplate.daysOverdue === 0
        ? 'bugun'
        : `${overdueTemplate.daysOverdue} kun kechikkan`;

    console.log(
      `   💰 ${formatAmount(overdueTemplate.amount)} so'm (${overdueLabel})`,
    );
    transactionsCreated++;
  }

  console.log('\n────────────────────────────────────');
  console.log(`🏪 Do'kon:         ${shopMembership!.shop.name}`);
  console.log(`👥 Mijozlar:       ${customersCreated} yaratildi, ${customersSkipped} mavjud`);
  console.log(`💳 Tranzaksiyalar: ${transactionsCreated} yaratildi, ${transactionsSkipped} mavjud`);
  console.log('────────────────────────────────────');
  console.log(
    '💡 Test: POST /api/notifications/trigger yoki Telegram /list',
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────

function formatAmount(amount: number): string {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function getCliArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return undefined;
  return process.argv[idx + 1];
}

// ─── Run ──────────────────────────────────────────────────────────────

main()
  .catch((e) => {
    console.error('❌ Seed xatolik:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
