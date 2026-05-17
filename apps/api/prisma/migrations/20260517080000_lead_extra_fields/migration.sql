-- Add missing lead fields to match full CRM requirements

ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "requirements"     TEXT,
  ADD COLUMN IF NOT EXISTS "description"      TEXT,
  ADD COLUMN IF NOT EXISTS "siteLocation"     TEXT,
  ADD COLUMN IF NOT EXISTS "siteVisitDate"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "nextFollowUpInfo" TEXT,
  ADD COLUMN IF NOT EXISTS "reference"        TEXT,
  ADD COLUMN IF NOT EXISTS "registryDoneDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "leadTitle"        TEXT,
  ADD COLUMN IF NOT EXISTS "campaignName"     TEXT,
  ADD COLUMN IF NOT EXISTS "campaignTeam"     TEXT;
