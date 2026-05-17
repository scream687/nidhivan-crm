-- Marketing Automation: segments, campaigns, campaign_logs, nurture_sequences, nurture_enrollments

CREATE TABLE IF NOT EXISTS "segments" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "filters" JSONB NOT NULL DEFAULT '{}',
  "leadCount" INTEGER NOT NULL DEFAULT 0,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "segments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "campaigns" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "segmentId" TEXT,
  "audienceFilter" JSONB,
  "messageTemplate" TEXT NOT NULL,
  "subject" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "scheduledAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "totalCount" INTEGER NOT NULL DEFAULT 0,
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "deliveredCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "campaigns_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "segments"("id") ON DELETE SET NULL,
  CONSTRAINT "campaigns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "campaign_logs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "campaignId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "contact" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "error" TEXT,
  "sentAt" TIMESTAMP(3),
  CONSTRAINT "campaign_logs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "campaign_logs_campaignId_idx" ON "campaign_logs"("campaignId");
CREATE INDEX IF NOT EXISTS "campaign_logs_leadId_idx" ON "campaign_logs"("leadId");

CREATE TABLE IF NOT EXISTS "nurture_sequences" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "triggerStage" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "steps" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "nurture_enrollments" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sequenceId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "currentStep" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "nextActionAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "nurture_enrollments_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "nurture_sequences"("id") ON DELETE CASCADE,
  UNIQUE ("sequenceId", "leadId")
);

CREATE INDEX IF NOT EXISTS "nurture_enrollments_status_nextActionAt_idx" ON "nurture_enrollments"("status", "nextActionAt");
