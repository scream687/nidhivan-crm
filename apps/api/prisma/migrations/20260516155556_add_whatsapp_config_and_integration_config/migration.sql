-- CreateTable
CREATE TABLE "whatsapp_config" (
    "id" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "wabaId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "verifyToken" TEXT NOT NULL DEFAULT 'nidhivan_whatsapp_verify',
    "displayName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_configs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "accessToken" TEXT,
    "metadata" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "integration_configs_type_key" ON "integration_configs"("type");

-- CreateIndex
CREATE INDEX "call_logs_callerId_createdAt_idx" ON "call_logs"("callerId", "createdAt");

-- CreateIndex
CREATE INDEX "leads_assignedToId_stage_idx" ON "leads"("assignedToId", "stage");

-- CreateIndex
CREATE INDEX "leads_assignedToId_createdAt_idx" ON "leads"("assignedToId", "createdAt");
