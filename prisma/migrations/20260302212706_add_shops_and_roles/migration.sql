/*
  Warnings:

  - You are about to drop the column `user_id` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `transactions` table. All the data in the column will be lost.
  - Added the required column `shop_id` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shop_id` to the `notifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by_id` to the `transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shop_id` to the `transactions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "shop_role" AS ENUM ('OWNER', 'ASSISTANT');

-- DropForeignKey
ALTER TABLE "customers" DROP CONSTRAINT "customers_user_id_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_user_id_fkey";

-- DropIndex
DROP INDEX "customers_user_id_idx";

-- DropIndex
DROP INDEX "notifications_user_id_created_at_idx";

-- DropIndex
DROP INDEX "notifications_user_id_is_read_idx";

-- DropIndex
DROP INDEX "transactions_user_id_created_at_idx";

-- DropIndex
DROP INDEX "transactions_user_id_idx";

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "user_id",
ADD COLUMN     "shop_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "shop_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "user_id",
ADD COLUMN     "created_by_id" TEXT NOT NULL,
ADD COLUMN     "shop_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "shops" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_members" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "role" "shop_role" NOT NULL DEFAULT 'ASSISTANT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shop_members_user_id_idx" ON "shop_members"("user_id");

-- CreateIndex
CREATE INDEX "shop_members_shop_id_idx" ON "shop_members"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "shop_members_user_id_shop_id_key" ON "shop_members"("user_id", "shop_id");

-- CreateIndex
CREATE INDEX "customers_shop_id_idx" ON "customers"("shop_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_shop_id_created_at_idx" ON "notifications"("user_id", "shop_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_shop_id_is_read_idx" ON "notifications"("user_id", "shop_id", "is_read");

-- CreateIndex
CREATE INDEX "transactions_shop_id_idx" ON "transactions"("shop_id");

-- CreateIndex
CREATE INDEX "transactions_shop_id_created_at_idx" ON "transactions"("shop_id", "created_at");

-- AddForeignKey
ALTER TABLE "shop_members" ADD CONSTRAINT "shop_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_members" ADD CONSTRAINT "shop_members_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
