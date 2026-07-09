-- Add indexes for frequently queried fields
-- CRM-044: Database performance indexes

-- RefreshToken: find tokens by userId
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- Task: filter by completion status
CREATE INDEX "tasks_isCompleted_idx" ON "tasks"("isCompleted");

-- SiteVisit: filter/sort by scheduled date
CREATE INDEX "site_visits_scheduledAt_idx" ON "site_visits"("scheduledAt");

-- Booking: sort by creation date
CREATE INDEX "bookings_createdAt_idx" ON "bookings"("createdAt");
