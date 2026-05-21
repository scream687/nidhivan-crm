-- CreateEnum
CREATE TYPE "VisitOutcome" AS ENUM ('COMPLETED', 'NO_SHOW', 'CANCELLED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "InterestLevel" AS ENUM ('HOT', 'WARM', 'COLD', 'NOT_INTERESTED');

-- DropForeignKey
ALTER TABLE "campaign_logs" DROP CONSTRAINT "campaign_logs_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "campaigns" DROP CONSTRAINT "campaigns_createdById_fkey";

-- DropForeignKey
ALTER TABLE "campaigns" DROP CONSTRAINT "campaigns_segmentId_fkey";

-- DropForeignKey
ALTER TABLE "nurture_enrollments" DROP CONSTRAINT "nurture_enrollments_sequenceId_fkey";

-- DropForeignKey
ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "password_reset_tokens_userId_fkey";

-- DropForeignKey
ALTER TABLE "segments" DROP CONSTRAINT "segments_createdById_fkey";

-- AlterTable
ALTER TABLE "campaigns" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "chatbot_rules" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "nurture_sequences" ALTER COLUMN "steps" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "segments" ALTER COLUMN "filters" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "site_visits" ADD COLUMN     "address" TEXT,
ADD COLUMN     "conductedById" TEXT,
ADD COLUMN     "followUpDate" TIMESTAMP(3),
ADD COLUMN     "followUpNotes" TEXT,
ADD COLUMN     "interestLevel" "InterestLevel",
ADD COLUMN     "objections" TEXT,
ADD COLUMN     "outcome" "VisitOutcome",
ADD COLUMN     "propertyShown" TEXT,
ADD COLUMN     "scheduledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "stage_configs" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "workflow_rules" ALTER COLUMN "actions" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_conductedById_fkey" FOREIGN KEY ("conductedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "segments" ADD CONSTRAINT "segments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "segments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_logs" ADD CONSTRAINT "campaign_logs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nurture_enrollments" ADD CONSTRAINT "nurture_enrollments_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "nurture_sequences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
