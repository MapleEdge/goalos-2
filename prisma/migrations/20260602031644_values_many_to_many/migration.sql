-- CreateTable
CREATE TABLE "_GoalValues" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_GoalValues_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_StakeholderValues" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_StakeholderValues_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_PrerequisiteValues" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PrerequisiteValues_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_EvidenceValues" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EvidenceValues_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ActionValues" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ActionValues_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_VehicleValues" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_VehicleValues_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_OpportunityValues" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_OpportunityValues_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ScheduleEventValues" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ScheduleEventValues_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_GoalValues_B_index" ON "_GoalValues"("B");

-- CreateIndex
CREATE INDEX "_StakeholderValues_B_index" ON "_StakeholderValues"("B");

-- CreateIndex
CREATE INDEX "_PrerequisiteValues_B_index" ON "_PrerequisiteValues"("B");

-- CreateIndex
CREATE INDEX "_EvidenceValues_B_index" ON "_EvidenceValues"("B");

-- CreateIndex
CREATE INDEX "_ActionValues_B_index" ON "_ActionValues"("B");

-- CreateIndex
CREATE INDEX "_VehicleValues_B_index" ON "_VehicleValues"("B");

-- CreateIndex
CREATE INDEX "_OpportunityValues_B_index" ON "_OpportunityValues"("B");

-- CreateIndex
CREATE INDEX "_ScheduleEventValues_B_index" ON "_ScheduleEventValues"("B");

-- AddForeignKey
ALTER TABLE "_GoalValues" ADD CONSTRAINT "_GoalValues_A_fkey" FOREIGN KEY ("A") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GoalValues" ADD CONSTRAINT "_GoalValues_B_fkey" FOREIGN KEY ("B") REFERENCES "values"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StakeholderValues" ADD CONSTRAINT "_StakeholderValues_A_fkey" FOREIGN KEY ("A") REFERENCES "stakeholders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StakeholderValues" ADD CONSTRAINT "_StakeholderValues_B_fkey" FOREIGN KEY ("B") REFERENCES "values"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PrerequisiteValues" ADD CONSTRAINT "_PrerequisiteValues_A_fkey" FOREIGN KEY ("A") REFERENCES "prerequisites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PrerequisiteValues" ADD CONSTRAINT "_PrerequisiteValues_B_fkey" FOREIGN KEY ("B") REFERENCES "values"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EvidenceValues" ADD CONSTRAINT "_EvidenceValues_A_fkey" FOREIGN KEY ("A") REFERENCES "evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EvidenceValues" ADD CONSTRAINT "_EvidenceValues_B_fkey" FOREIGN KEY ("B") REFERENCES "values"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActionValues" ADD CONSTRAINT "_ActionValues_A_fkey" FOREIGN KEY ("A") REFERENCES "actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActionValues" ADD CONSTRAINT "_ActionValues_B_fkey" FOREIGN KEY ("B") REFERENCES "values"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VehicleValues" ADD CONSTRAINT "_VehicleValues_A_fkey" FOREIGN KEY ("A") REFERENCES "values"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VehicleValues" ADD CONSTRAINT "_VehicleValues_B_fkey" FOREIGN KEY ("B") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OpportunityValues" ADD CONSTRAINT "_OpportunityValues_A_fkey" FOREIGN KEY ("A") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OpportunityValues" ADD CONSTRAINT "_OpportunityValues_B_fkey" FOREIGN KEY ("B") REFERENCES "values"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ScheduleEventValues" ADD CONSTRAINT "_ScheduleEventValues_A_fkey" FOREIGN KEY ("A") REFERENCES "schedule_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ScheduleEventValues" ADD CONSTRAINT "_ScheduleEventValues_B_fkey" FOREIGN KEY ("B") REFERENCES "values"("id") ON DELETE CASCADE ON UPDATE CASCADE;
