-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('PROCUREMENT', 'TRANSPORT');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('SMALL', 'MEDIUM', 'LARGE');

-- CreateEnum
CREATE TYPE "TransportStatus" AS ENUM ('REQUESTED', 'ASSIGNED', 'ON_THE_WAY', 'PICKED_UP', 'DELIVERED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'TRANSPORT_UPDATE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentStatus" ADD VALUE 'PENDING';
ALTER TYPE "PaymentStatus" ADD VALUE 'FAILED';
ALTER TYPE "PaymentStatus" ADD VALUE 'REFUNDED';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'inr',
ADD COLUMN     "kind" "PaymentKind" NOT NULL DEFAULT 'PROCUREMENT',
ADD COLUMN     "platformFee" DOUBLE PRECISION,
ADD COLUMN     "stripeCheckoutSessionId" TEXT,
ADD COLUMN     "stripePaymentIntentId" TEXT,
ADD COLUMN     "transportAmount" DOUBLE PRECISION,
ADD COLUMN     "transportId" TEXT,
ALTER COLUMN "procurementId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "supabaseId" TEXT,
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "transports" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "procurementId" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "pickupLocation" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "estimatedCost" DOUBLE PRECISION NOT NULL,
    "platformFee" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "status" "TransportStatus" NOT NULL DEFAULT 'REQUESTED',
    "driverName" TEXT,
    "driverPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transports_procurementId_key" ON "transports"("procurementId");

-- CreateIndex
CREATE INDEX "transports_farmerId_idx" ON "transports"("farmerId");

-- CreateIndex
CREATE INDEX "transports_status_idx" ON "transports"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_transportId_key" ON "payments"("transportId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripeCheckoutSessionId_key" ON "payments"("stripeCheckoutSessionId");

-- CreateIndex
CREATE INDEX "payments_kind_status_idx" ON "payments"("kind", "status");

-- CreateIndex
CREATE UNIQUE INDEX "users_supabaseId_key" ON "users"("supabaseId");

-- AddForeignKey
ALTER TABLE "transports" ADD CONSTRAINT "transports_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "farmers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transports" ADD CONSTRAINT "transports_procurementId_fkey" FOREIGN KEY ("procurementId") REFERENCES "procurements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transports" ADD CONSTRAINT "transports_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "procurement_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_transportId_fkey" FOREIGN KEY ("transportId") REFERENCES "transports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

