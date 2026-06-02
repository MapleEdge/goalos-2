-- CreateEnum
CREATE TYPE "FlowDirection" AS ENUM ('INFLOW', 'OUTFLOW');

-- CreateEnum
CREATE TYPE "FlowFrequency" AS ENUM ('ONE_TIME', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "SuggestionDecision" AS ENUM ('ACCEPTED', 'REJECTED', 'SKIPPED');

-- CreateTable
CREATE TABLE "resource_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_flows" (
    "id" TEXT NOT NULL,
    "resourceTypeId" TEXT NOT NULL,
    "entityType" "NodeType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "direction" "FlowDirection" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "frequency" "FlowFrequency" NOT NULL DEFAULT 'ONE_TIME',
    "label" TEXT NOT NULL,
    "notes" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_dimensions" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "icon" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_dimensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "briefing_sessions" (
    "id" TEXT NOT NULL,
    "inputText" TEXT NOT NULL,
    "aiSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "briefing_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "briefing_suggestions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityTitle" TEXT NOT NULL,
    "reason" TEXT,
    "proposedData" JSONB NOT NULL,
    "decision" "SuggestionDecision" NOT NULL DEFAULT 'ACCEPTED',
    "rejectionReason" TEXT,
    "resultAction" TEXT,
    "resultEntityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "briefing_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "resource_types_name_key" ON "resource_types"("name");

-- CreateIndex
CREATE INDEX "resource_flows_entityType_entityId_idx" ON "resource_flows"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "resource_flows_resourceTypeId_idx" ON "resource_flows"("resourceTypeId");

-- CreateIndex
CREATE INDEX "resource_flows_direction_idx" ON "resource_flows"("direction");

-- CreateIndex
CREATE UNIQUE INDEX "control_dimensions_vehicleId_name_key" ON "control_dimensions"("vehicleId", "name");

-- CreateIndex
CREATE INDEX "briefing_sessions_createdAt_idx" ON "briefing_sessions"("createdAt");

-- CreateIndex
CREATE INDEX "briefing_suggestions_sessionId_idx" ON "briefing_suggestions"("sessionId");

-- CreateIndex
CREATE INDEX "briefing_suggestions_entityType_idx" ON "briefing_suggestions"("entityType");

-- CreateIndex
CREATE INDEX "briefing_suggestions_decision_idx" ON "briefing_suggestions"("decision");

-- AddForeignKey
ALTER TABLE "resource_flows" ADD CONSTRAINT "resource_flows_resourceTypeId_fkey" FOREIGN KEY ("resourceTypeId") REFERENCES "resource_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_dimensions" ADD CONSTRAINT "control_dimensions_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "briefing_suggestions" ADD CONSTRAINT "briefing_suggestions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "briefing_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
