-- Reconciles migration history with schema.prisma.
-- These objects were applied to local databases with `prisma db push` and never
-- captured as a migration, so a database built from migrations alone was missing
-- 5 tables (plots, site_visit_requests, landing_pages, referral_codes,
-- company_settings) along with related columns, indexes and foreign keys.

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "agentCommission" DECIMAL(15,2),
ADD COLUMN     "bookingLetterUrl" TEXT,
ADD COLUMN     "bookingTimeline" JSONB DEFAULT '[]',
ADD COLUMN     "commissionNotes" TEXT,
ADD COLUMN     "commissionPaidAt" TIMESTAMP(3),
ADD COLUMN     "commissionStatus" TEXT DEFAULT 'PENDING',
ADD COLUMN     "documents" JSONB DEFAULT '[]',
ADD COLUMN     "receiptUrl" TEXT,
ADD COLUMN     "registryDate" TIMESTAMP(3),
ADD COLUMN     "registryNumber" TEXT,
ADD COLUMN     "registryStatus" TEXT DEFAULT 'TOKEN',
ADD COLUMN     "tokenAmount" DECIMAL(15,2),
ADD COLUMN     "tokenDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "landingPageId" TEXT,
ADD COLUMN     "referralCode" TEXT;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "brochureUrl" TEXT,
ADD COLUMN     "googleMapsEmbed" TEXT,
ADD COLUMN     "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "masterPlanUrl" TEXT,
ADD COLUMN     "nearbyPlaces" JSONB,
ADD COLUMN     "possession" TEXT,
ADD COLUMN     "priceMax" DECIMAL(15,2),
ADD COLUMN     "priceMin" DECIMAL(15,2),
ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "videoUrl" TEXT,
ADD COLUMN     "virtualTourUrl" TEXT;

-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "userAgent" TEXT;

-- AlterTable
ALTER TABLE "site_visits" ADD COLUMN     "driverName" TEXT,
ADD COLUMN     "driverPhone" TEXT,
ADD COLUMN     "gpsCheckedInAt" TIMESTAMP(3),
ADD COLUMN     "gpsLatitude" DOUBLE PRECISION,
ADD COLUMN     "gpsLongitude" DOUBLE PRECISION,
ADD COLUMN     "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "pickupLocation" TEXT,
ADD COLUMN     "pickupTime" TEXT;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "escalatedAt" TIMESTAMP(3),
ADD COLUMN     "escalationLevel" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "followupType" TEXT,
ADD COLUMN     "reminderAt" TIMESTAMP(3),
ADD COLUMN     "reminderNote" TEXT,
ADD COLUMN     "reminderSent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "notificationPreferences" JSONB DEFAULT '{}';

-- CreateTable
CREATE TABLE "plots" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "block" TEXT,
    "road" TEXT,
    "plotNumber" TEXT NOT NULL,
    "facing" TEXT,
    "dimensions" TEXT,
    "area" DECIMAL(10,2),
    "areaUnit" TEXT NOT NULL DEFAULT 'SQ_YD',
    "ratePerUnit" DECIMAL(15,2),
    "totalPrice" DECIMAL(15,2),
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "isCorner" BOOLEAN NOT NULL DEFAULT false,
    "isAvenue" BOOLEAN NOT NULL DEFAULT false,
    "roadWidth" TEXT,
    "gpsLatitude" DOUBLE PRECISION,
    "gpsLongitude" DOUBLE PRECISION,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_visit_requests" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "preferredDate" TIMESTAMP(3),
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_visit_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_pages" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "headTitle" TEXT,
    "headDescription" TEXT,
    "heroHeadline" TEXT,
    "heroSubheadline" TEXT,
    "heroCtaText" TEXT,
    "heroImageUrl" TEXT,
    "sections" JSONB DEFAULT '[]',
    "showGallery" BOOLEAN NOT NULL DEFAULT true,
    "showAmenities" BOOLEAN NOT NULL DEFAULT true,
    "showForm" BOOLEAN NOT NULL DEFAULT true,
    "showMap" BOOLEAN NOT NULL DEFAULT true,
    "visitorCount" INTEGER NOT NULL DEFAULT 0,
    "leadsGenerated" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "projectId" TEXT NOT NULL,
    "discountPct" DECIMAL(5,2),
    "discountAmt" DECIMAL(15,2),
    "maxUses" INTEGER NOT NULL DEFAULT 0,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_settings" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "gstin" TEXT,
    "reraNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plots_projectId_idx" ON "plots"("projectId");

-- CreateIndex
CREATE INDEX "plots_projectId_status_idx" ON "plots"("projectId", "status");

-- CreateIndex
CREATE INDEX "plots_plotNumber_idx" ON "plots"("plotNumber");

-- CreateIndex
CREATE INDEX "site_visit_requests_projectId_idx" ON "site_visit_requests"("projectId");

-- CreateIndex
CREATE INDEX "site_visit_requests_status_idx" ON "site_visit_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "landing_pages_slug_key" ON "landing_pages"("slug");

-- CreateIndex
CREATE INDEX "landing_pages_projectId_idx" ON "landing_pages"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_code_key" ON "referral_codes"("code");

-- CreateIndex
CREATE INDEX "referral_codes_projectId_idx" ON "referral_codes"("projectId");

-- CreateIndex
CREATE INDEX "call_logs_receiverId_idx" ON "call_logs"("receiverId");

-- CreateIndex
CREATE INDEX "leads_createdById_idx" ON "leads"("createdById");

-- CreateIndex
CREATE INDEX "leads_updatedAt_idx" ON "leads"("updatedAt");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- CreateIndex
CREATE INDEX "tasks_reminderAt_idx" ON "tasks"("reminderAt");

-- CreateIndex
CREATE INDEX "tasks_escalationLevel_idx" ON "tasks"("escalationLevel");

-- AddForeignKey
ALTER TABLE "plots" ADD CONSTRAINT "plots_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_visit_requests" ADD CONSTRAINT "site_visit_requests_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_pages" ADD CONSTRAINT "landing_pages_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

