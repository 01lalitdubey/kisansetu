-- CreateEnum
CREATE TYPE "Role" AS ENUM ('FARMER', 'CENTER_OFFICER', 'ADMIN');

-- CreateEnum
CREATE TYPE "CenterStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CLOSED', 'OVERLOADED');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TokenStatus" AS ENUM ('BOOKED', 'WAITING', 'SERVING', 'COMPLETED', 'SKIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QueueEntryStatus" AS ENUM ('WAITING', 'SERVING', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ProcurementStatus" AS ENUM ('PENDING', 'QUALITY_CHECK', 'WEIGHMENT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PROCESSING', 'PAID', 'DELAYED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SCHEDULE_CHANGE', 'QUEUE_ALERT', 'PROCUREMENT_STARTED', 'TOKEN_UPDATE', 'HIGH_DEMAND', 'PAYMENT_UPDATE');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('PENDING', 'APPLIED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "PredictionKind" AS ENUM ('WAIT_TIME', 'SLOT_RECOMMENDATION', 'CENTER_LOAD', 'LOAD_BALANCING');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farmers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "village" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "primaryCropId" TEXT,
    "approxQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farmers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "officers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "officers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crops" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "msp" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_centers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "capacity" INTEGER NOT NULL,
    "currentQueue" INTEGER NOT NULL DEFAULT 0,
    "farmersServed" INTEGER NOT NULL DEFAULT 0,
    "activeCounters" INTEGER NOT NULL DEFAULT 3,
    "averageProcessingTime" DOUBLE PRECISION NOT NULL DEFAULT 7,
    "status" "CenterStatus" NOT NULL DEFAULT 'ACTIVE',
    "mapX" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "mapY" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procurement_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_schedules" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "cropId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "maxFarmers" INTEGER NOT NULL,
    "bookedFarmers" INTEGER NOT NULL DEFAULT 0,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'UPCOMING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procurement_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens" (
    "id" TEXT NOT NULL,
    "tokenNumber" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "cropId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "slotStart" TEXT NOT NULL,
    "slotEnd" TEXT NOT NULL,
    "queuePosition" INTEGER NOT NULL,
    "estimatedWait" INTEGER NOT NULL,
    "status" "TokenStatus" NOT NULL DEFAULT 'BOOKED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queues" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "running" BOOLEAN NOT NULL DEFAULT true,
    "status" "CenterStatus" NOT NULL DEFAULT 'ACTIVE',
    "nowServingTokenId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_entries" (
    "id" TEXT NOT NULL,
    "queueId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" "QueueEntryStatus" NOT NULL DEFAULT 'WAITING',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "queue_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurements" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "cropId" TEXT NOT NULL,
    "declaredQuantity" DOUBLE PRECISION NOT NULL,
    "actualQuantity" DOUBLE PRECISION,
    "qualityGrade" TEXT,
    "msp" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION,
    "status" "ProcurementStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "procurementId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PROCESSING',
    "expectedDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "meta" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_predictions" (
    "id" TEXT NOT NULL,
    "kind" "PredictionKind" NOT NULL,
    "centerId" TEXT,
    "scheduleId" TEXT,
    "predictedWait" INTEGER NOT NULL,
    "confidence" INTEGER NOT NULL,
    "factors" TEXT[],
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "center_recommendations" (
    "id" TEXT NOT NULL,
    "fromCenterId" TEXT NOT NULL,
    "toCenterId" TEXT NOT NULL,
    "overflowPercent" INTEGER NOT NULL,
    "redirectFarmers" INTEGER NOT NULL,
    "waitBeforeMinutes" INTEGER NOT NULL,
    "waitAfterMinutes" INTEGER NOT NULL,
    "reductionPercent" INTEGER NOT NULL,
    "reasons" TEXT[],
    "status" "RecommendationStatus" NOT NULL DEFAULT 'PENDING',
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "center_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_mobile_key" ON "users"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "farmers_userId_key" ON "farmers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "officers_userId_key" ON "officers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "admins_userId_key" ON "admins"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "crops_name_key" ON "crops"("name");

-- CreateIndex
CREATE UNIQUE INDEX "procurement_centers_name_key" ON "procurement_centers"("name");

-- CreateIndex
CREATE INDEX "procurement_schedules_centerId_date_idx" ON "procurement_schedules"("centerId", "date");

-- CreateIndex
CREATE INDEX "tokens_centerId_status_idx" ON "tokens"("centerId", "status");

-- CreateIndex
CREATE INDEX "tokens_farmerId_idx" ON "tokens"("farmerId");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_centerId_tokenNumber_key" ON "tokens"("centerId", "tokenNumber");

-- CreateIndex
CREATE UNIQUE INDEX "queues_centerId_key" ON "queues"("centerId");

-- CreateIndex
CREATE UNIQUE INDEX "queue_entries_tokenId_key" ON "queue_entries"("tokenId");

-- CreateIndex
CREATE INDEX "queue_entries_queueId_status_idx" ON "queue_entries"("queueId", "status");

-- CreateIndex
CREATE INDEX "queue_entries_queueId_position_idx" ON "queue_entries"("queueId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "procurements_tokenId_key" ON "procurements"("tokenId");

-- CreateIndex
CREATE INDEX "procurements_centerId_idx" ON "procurements"("centerId");

-- CreateIndex
CREATE INDEX "procurements_farmerId_idx" ON "procurements"("farmerId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_procurementId_key" ON "payments"("procurementId");

-- CreateIndex
CREATE INDEX "notifications_farmerId_createdAt_idx" ON "notifications"("farmerId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_predictions_kind_createdAt_idx" ON "ai_predictions"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "center_recommendations_status_createdAt_idx" ON "center_recommendations"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "farmers" ADD CONSTRAINT "farmers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmers" ADD CONSTRAINT "farmers_primaryCropId_fkey" FOREIGN KEY ("primaryCropId") REFERENCES "crops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "officers" ADD CONSTRAINT "officers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "officers" ADD CONSTRAINT "officers_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "procurement_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_schedules" ADD CONSTRAINT "procurement_schedules_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "procurement_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_schedules" ADD CONSTRAINT "procurement_schedules_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "crops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "farmers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "procurement_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "procurement_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "crops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queues" ADD CONSTRAINT "queues_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "procurement_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "queues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurements" ADD CONSTRAINT "procurements_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurements" ADD CONSTRAINT "procurements_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "farmers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurements" ADD CONSTRAINT "procurements_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "procurement_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurements" ADD CONSTRAINT "procurements_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "crops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_procurementId_fkey" FOREIGN KEY ("procurementId") REFERENCES "procurements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "farmers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "farmers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "center_recommendations" ADD CONSTRAINT "center_recommendations_fromCenterId_fkey" FOREIGN KEY ("fromCenterId") REFERENCES "procurement_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "center_recommendations" ADD CONSTRAINT "center_recommendations_toCenterId_fkey" FOREIGN KEY ("toCenterId") REFERENCES "procurement_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
