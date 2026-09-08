-- CreateEnum
CREATE TYPE "CenterApprovalStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- AlterTable
ALTER TABLE "farmers" ADD COLUMN     "addressLine" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "pincode" TEXT,
ADD COLUMN     "state" TEXT;

-- AlterTable
ALTER TABLE "procurement_centers" ADD COLUMN     "addressLine" TEXT,
ADD COLUMN     "approvalStatus" "CenterApprovalStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN     "city" TEXT,
ADD COLUMN     "contactNumber" TEXT,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "isSeed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pincode" TEXT,
ADD COLUMN     "registeredById" TEXT,
ADD COLUMN     "state" TEXT DEFAULT 'Rajasthan',
ADD COLUMN     "supportedCrops" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AddForeignKey
ALTER TABLE "procurement_centers" ADD CONSTRAINT "procurement_centers_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

