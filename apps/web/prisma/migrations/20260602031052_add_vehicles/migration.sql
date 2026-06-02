-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'WAITING', 'COMPLETED', 'ARCHIVED', 'PAUSED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "PrerequisiteStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ActionPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "NodeType" AS ENUM ('GOAL', 'STAKEHOLDER', 'PREREQUISITE', 'EVIDENCE', 'ACTION', 'VEHICLE');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('IDENTIFIED', 'RESEARCHING', 'ACQUIRING', 'BUILDING', 'ACTIVE', 'DORMANT', 'RETIRED');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('EDUCATION', 'EMPLOYMENT', 'BUSINESS', 'ASSET', 'PLATFORM', 'NETWORK', 'ORGANIZATION', 'EVENT_SERIES', 'SKILL', 'OTHER');

-- CreateEnum
CREATE TYPE "CalendarProvider" AS ENUM ('GOOGLE', 'MICROSOFT');

-- CreateEnum
CREATE TYPE "ScheduleEventSource" AS ENUM ('GOALOS', 'GOOGLE', 'MICROSOFT');

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetDate" TIMESTAMP(3),
    "successCriteria" TEXT,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "valueId" TEXT,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stakeholders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization" TEXT,
    "role" TEXT,
    "relationshipStrength" INTEGER NOT NULL DEFAULT 0,
    "lastInteraction" TIMESTAMP(3),
    "notes" TEXT,
    "capabilities" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stakeholders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prerequisites" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "PrerequisiteStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "confidenceScore" INTEGER NOT NULL DEFAULT 0,
    "goalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prerequisites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "source" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prerequisiteId" TEXT,
    "stakeholderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ActionStatus" NOT NULL DEFAULT 'TODO',
    "priority" "ActionPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueDate" TIMESTAMP(3),
    "goalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relationships" (
    "id" TEXT NOT NULL,
    "fromType" "NodeType" NOT NULL,
    "fromId" TEXT NOT NULL,
    "toType" "NodeType" NOT NULL,
    "toId" TEXT NOT NULL,
    "label" TEXT,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "goalFromId" TEXT,
    "goalToId" TEXT,
    "stakeholderFromId" TEXT,
    "stakeholderToId" TEXT,
    "prereqFromId" TEXT,
    "prereqToId" TEXT,
    "evidenceFromId" TEXT,
    "evidenceToId" TEXT,
    "actionFromId" TEXT,
    "actionToId" TEXT,
    "vehicleFromId" TEXT,
    "vehicleToId" TEXT,

    CONSTRAINT "relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "values" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "VehicleType" NOT NULL,
    "status" "VehicleStatus" NOT NULL DEFAULT 'IDENTIFIED',
    "institution" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "investmentNotes" TEXT,
    "leverageScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "valueId" TEXT,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_goals" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "leverage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "vehicleId" TEXT NOT NULL,
    "goalId" TEXT,
    "realized" BOOLEAN NOT NULL DEFAULT false,
    "realizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_connections" (
    "id" TEXT NOT NULL,
    "provider" "CalendarProvider" NOT NULL,
    "accountEmail" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "calendarId" TEXT,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "source" "ScheduleEventSource" NOT NULL DEFAULT 'GOALOS',
    "externalId" TEXT,
    "externalCalendarId" TEXT,
    "goalId" TEXT,
    "actionId" TEXT,
    "calendarConnectionId" TEXT,
    "color" TEXT,
    "recurrence" TEXT,
    "recurrenceGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "entityType" "NodeType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "relationships_fromType_fromId_toType_toId_key" ON "relationships"("fromType", "fromId", "toType", "toId");

-- CreateIndex
CREATE UNIQUE INDEX "values_label_key" ON "values"("label");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_goals_vehicleId_goalId_key" ON "vehicle_goals"("vehicleId", "goalId");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_connections_provider_accountEmail_key" ON "calendar_connections"("provider", "accountEmail");

-- CreateIndex
CREATE INDEX "schedule_events_startTime_endTime_idx" ON "schedule_events"("startTime", "endTime");

-- CreateIndex
CREATE INDEX "schedule_events_goalId_idx" ON "schedule_events"("goalId");

-- CreateIndex
CREATE INDEX "schedule_events_actionId_idx" ON "schedule_events"("actionId");

-- CreateIndex
CREATE INDEX "schedule_events_externalId_idx" ON "schedule_events"("externalId");

-- CreateIndex
CREATE INDEX "schedule_events_recurrenceGroupId_idx" ON "schedule_events"("recurrenceGroupId");

-- CreateIndex
CREATE INDEX "events_entityType_entityId_idx" ON "events"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "events_occurredAt_idx" ON "events"("occurredAt");

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_valueId_fkey" FOREIGN KEY ("valueId") REFERENCES "values"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prerequisites" ADD CONSTRAINT "prerequisites_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "prerequisites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_stakeholderId_fkey" FOREIGN KEY ("stakeholderId") REFERENCES "stakeholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions" ADD CONSTRAINT "actions_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_goalFromId_fkey" FOREIGN KEY ("goalFromId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_goalToId_fkey" FOREIGN KEY ("goalToId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_stakeholderFromId_fkey" FOREIGN KEY ("stakeholderFromId") REFERENCES "stakeholders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_stakeholderToId_fkey" FOREIGN KEY ("stakeholderToId") REFERENCES "stakeholders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_prereqFromId_fkey" FOREIGN KEY ("prereqFromId") REFERENCES "prerequisites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_prereqToId_fkey" FOREIGN KEY ("prereqToId") REFERENCES "prerequisites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_evidenceFromId_fkey" FOREIGN KEY ("evidenceFromId") REFERENCES "evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_evidenceToId_fkey" FOREIGN KEY ("evidenceToId") REFERENCES "evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_actionFromId_fkey" FOREIGN KEY ("actionFromId") REFERENCES "actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_actionToId_fkey" FOREIGN KEY ("actionToId") REFERENCES "actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_vehicleFromId_fkey" FOREIGN KEY ("vehicleFromId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_vehicleToId_fkey" FOREIGN KEY ("vehicleToId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_valueId_fkey" FOREIGN KEY ("valueId") REFERENCES "values"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_goals" ADD CONSTRAINT "vehicle_goals_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_goals" ADD CONSTRAINT "vehicle_goals_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_calendarConnectionId_fkey" FOREIGN KEY ("calendarConnectionId") REFERENCES "calendar_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
