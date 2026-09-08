-- AlterTable
ALTER TABLE "procurement_centers" ADD COLUMN     "code" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "dataSource" TEXT NOT NULL DEFAULT 'DEMO',
ADD COLUMN     "governmentReference" TEXT,
ADD COLUMN     "lastVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "operatingHours" TEXT,
ADD COLUMN     "season" TEXT;

-- CreateTable
CREATE TABLE "knowledge_documents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "documentType" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "documentDate" TIMESTAMP(3),
    "season" TEXT,
    "crop" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "knowledge_documents_crop_idx" ON "knowledge_documents"("crop");

-- CreateIndex
CREATE INDEX "knowledge_documents_season_idx" ON "knowledge_documents"("season");

-- CreateIndex
CREATE INDEX "knowledge_documents_documentType_idx" ON "knowledge_documents"("documentType");
