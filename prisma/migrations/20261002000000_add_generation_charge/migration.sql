-- S01 T-002 · T-Coin 收费请求账本
-- 幂等键 (userId, idempotencyKey) 唯一；state: reserved -> settled | released
-- 回滚：DROP TABLE "lekao_generation_charges"; DROP TYPE "LekaoChargeState";

-- CreateEnum
CREATE TYPE "LekaoChargeState" AS ENUM ('reserved', 'settled', 'released');

-- CreateTable
CREATE TABLE "lekao_generation_charges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 1,
    "source" TEXT,
    "state" "LekaoChargeState" NOT NULL DEFAULT 'reserved',
    "correlationId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "lekao_generation_charges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lekao_generation_charges_userId_createdAt_idx" ON "lekao_generation_charges"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "lekao_generation_charges_state_createdAt_idx" ON "lekao_generation_charges"("state", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "lekao_generation_charges_userId_idempotencyKey_key" ON "lekao_generation_charges"("userId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "lekao_generation_charges" ADD CONSTRAINT "lekao_generation_charges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;