-- Cast enum columns to TEXT preserving all existing data

-- lead_stage_logs: cast fromStage and toStage from enum to text
ALTER TABLE "lead_stage_logs" ALTER COLUMN "fromStage" TYPE TEXT USING "fromStage"::TEXT;
ALTER TABLE "lead_stage_logs" ALTER COLUMN "toStage" TYPE TEXT USING "toStage"::TEXT;

-- leads: cast stage from enum to text
ALTER TABLE "leads" ALTER COLUMN "stage" TYPE TEXT USING "stage"::TEXT;
ALTER TABLE "leads" ALTER COLUMN "stage" SET DEFAULT 'NEW';

-- Drop the enum (safe now that all columns are TEXT)
DROP TYPE IF EXISTS "LeadStage";

-- CreateTable stage_configs
CREATE TABLE "stage_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6b7280',
    "bgColor" TEXT NOT NULL DEFAULT '#f3f4f6',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isWon" BOOLEAN NOT NULL DEFAULT false,
    "isLost" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stage_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable saved_filters
CREATE TABLE "saved_filters" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_filters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stage_configs_name_key" ON "stage_configs"("name");
CREATE INDEX "saved_filters_userId_idx" ON "saved_filters"("userId");

-- AddForeignKey
ALTER TABLE "saved_filters" ADD CONSTRAINT "saved_filters_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default stages
INSERT INTO "stage_configs" ("id", "name", "label", "color", "bgColor", "order", "isDefault", "isWon", "isLost", "isSystem", "isActive", "updatedAt") VALUES
  (gen_random_uuid()::TEXT, 'NEW',                  'New',                   '#3b82f6', '#eff6ff', 0,  true,  false, false, true, true, NOW()),
  (gen_random_uuid()::TEXT, 'ATTEMPTED',             'Attempted',             '#6b7280', '#f9fafb', 1,  false, false, false, true, true, NOW()),
  (gen_random_uuid()::TEXT, 'CONNECTED',             'Connected',             '#8b5cf6', '#f5f3ff', 2,  false, false, false, true, true, NOW()),
  (gen_random_uuid()::TEXT, 'INTERESTED',            'Interested',            '#06b6d4', '#ecfeff', 3,  false, false, false, true, true, NOW()),
  (gen_random_uuid()::TEXT, 'HOT',                   'Hot',                   '#ef4444', '#fef2f2', 4,  false, false, false, true, true, NOW()),
  (gen_random_uuid()::TEXT, 'SITE_VISIT_SCHEDULED',  'Site Visit Scheduled',  '#f59e0b', '#fffbeb', 5,  false, false, false, true, true, NOW()),
  (gen_random_uuid()::TEXT, 'SITE_VISIT_COMPLETED',  'Site Visit Completed',  '#f97316', '#fff7ed', 6,  false, false, false, true, true, NOW()),
  (gen_random_uuid()::TEXT, 'NEGOTIATION',           'Negotiation',           '#a855f7', '#faf5ff', 7,  false, false, false, true, true, NOW()),
  (gen_random_uuid()::TEXT, 'BOOKING_PENDING',       'Booking Pending',       '#eab308', '#fefce8', 8,  false, false, false, true, true, NOW()),
  (gen_random_uuid()::TEXT, 'CLOSED_WON',            'Closed Won',            '#10b981', '#ecfdf5', 9,  false, true,  false, true, true, NOW()),
  (gen_random_uuid()::TEXT, 'CLOSED_LOST',           'Closed Lost',           '#ef4444', '#fef2f2', 10, false, false, true,  true, true, NOW()),
  (gen_random_uuid()::TEXT, 'FUTURE_PROSPECT',       'Future Prospect',       '#64748b', '#f8fafc', 11, false, false, false, true, true, NOW());
