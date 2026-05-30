import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://goalos:goalos_dev@localhost:5432/goalos?schema=public";

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clean existing data
  await prisma.event.deleteMany();
  await prisma.relationship.deleteMany();
  await prisma.evidence.deleteMany();
  await prisma.action.deleteMany();
  await prisma.prerequisite.deleteMany();
  await prisma.stakeholder.deleteMany();
  await prisma.goal.deleteMany();

  // Create goals
  const taGoal = await prisma.goal.create({
    data: {
      title: "Obtain TA Position",
      description:
        "Secure a teaching assistant role in the Computer Science department for Fall semester",
      targetDate: new Date("2025-08-15"),
      successCriteria: "Receive official TA appointment letter",
      status: "ACTIVE",
    },
  });

  const startupGoal = await prisma.goal.create({
    data: {
      title: "Raise Pre-Seed Round",
      description:
        "Close a $500K pre-seed round for the AI productivity startup",
      targetDate: new Date("2025-06-30"),
      successCriteria: "Term sheet signed, funds in bank",
      status: "ACTIVE",
    },
  });

  const researchGoal = await prisma.goal.create({
    data: {
      title: "Publish Research Paper",
      description:
        "Submit and publish a paper on graph-based reasoning systems at a top-tier conference",
      targetDate: new Date("2025-12-01"),
      successCriteria: "Paper accepted at NeurIPS, ICML, or similar venue",
      status: "ACTIVE",
    },
  });

  // Create stakeholders
  const profChen = await prisma.stakeholder.create({
    data: {
      name: "Prof. Chen",
      organization: "CS Department",
      role: "Professor, CS 301",
      relationshipStrength: 75,
      lastInteraction: new Date("2025-01-20"),
      notes: "Very supportive, met during office hours multiple times",
    },
  });

  const sarahKim = await prisma.stakeholder.create({
    data: {
      name: "Sarah Kim",
      organization: "Sequoia Capital",
      role: "Venture Partner",
      relationshipStrength: 30,
      lastInteraction: new Date("2024-12-15"),
      notes: "Met at YC Demo Day, expressed interest in AI tools",
    },
  });

  const drPatel = await prisma.stakeholder.create({
    data: {
      name: "Dr. Patel",
      organization: "ML Research Lab",
      role: "Lab Director",
      relationshipStrength: 60,
      lastInteraction: new Date("2025-01-10"),
      notes: "Potential research advisor, strong publication record",
    },
  });

  // Create additional stakeholders for realistic network
  const additionalStakeholders = [
    { name: "Lisa Wang", organization: "Accel Partners", role: "Associate", relationshipStrength: 20, lastInteraction: new Date("2024-11-01"), notes: "Brief intro at networking event" },
    { name: "James Rodriguez", organization: "CS Department", role: "PhD Student", relationshipStrength: 55, lastInteraction: new Date("2025-01-05"), notes: "Collaborator on side project" },
    { name: "Emily Zhang", organization: "Google Research", role: "Research Scientist", relationshipStrength: 40, lastInteraction: new Date("2024-10-15"), notes: "Met at ICML poster session" },
    { name: "Michael Torres", organization: "Stanford AI Lab", role: "Postdoc", relationshipStrength: 35, lastInteraction: new Date("2024-09-20"), notes: "Potential co-author" },
    { name: "Anna Kowalski", organization: "YC", role: "Group Partner", relationshipStrength: 15, lastInteraction: new Date("2024-08-10"), notes: "Attended YC info session" },
    { name: "David Lee", organization: "Andreessen Horowitz", role: "Partner", relationshipStrength: 10, lastInteraction: new Date("2024-07-22"), notes: "Cold email, no response yet" },
    { name: "Rachel Green", organization: "MIT Media Lab", role: "Professor", relationshipStrength: 45, lastInteraction: new Date("2025-01-15"), notes: "Guest lecture attendee" },
    { name: "Tom Nakamura", organization: "AngelList", role: "Angel Investor", relationshipStrength: 25, lastInteraction: new Date("2024-12-01"), notes: "Connected via Sarah Kim" },
    { name: "Priya Sharma", organization: "Microsoft Research", role: "Principal Researcher", relationshipStrength: 50, lastInteraction: new Date("2025-01-08"), notes: "Co-authored workshop paper" },
    { name: "Alex Chen", organization: "CS Department", role: "Adjunct Professor", relationshipStrength: 65, lastInteraction: new Date("2025-01-22"), notes: "TA for his class last semester" },
    { name: "Jessica Park", organization: "Benchmark", role: "Principal", relationshipStrength: 5, lastInteraction: new Date("2024-06-15"), notes: "LinkedIn connection only" },
    { name: "Robert Kim", organization: "IEEE", role: "Conference Chair", relationshipStrength: 30, lastInteraction: new Date("2024-11-20"), notes: "Submitted paper to his track" },
    { name: "Maria Santos", organization: "OpenAI", role: "ML Engineer", relationshipStrength: 35, lastInteraction: new Date("2024-12-10"), notes: "Former classmate" },
    { name: "Kevin O'Brien", organization: "CS Department", role: "Department Head", relationshipStrength: 20, lastInteraction: new Date("2024-10-01"), notes: "Brief meeting about TA program" },
    { name: "Sophia Andersson", organization: "DeepMind", role: "Research Lead", relationshipStrength: 15, lastInteraction: new Date("2024-09-05"), notes: "Cited her work in thesis" },
    { name: "Chris Johnson", organization: "Founders Fund", role: "Scout", relationshipStrength: 25, lastInteraction: new Date("2024-11-30"), notes: "Warm intro from Tom" },
    { name: "Diana Wu", organization: "Stanford CS", role: "PhD Candidate", relationshipStrength: 70, lastInteraction: new Date("2025-01-18"), notes: "Close research collaborator" },
  ];

  for (const s of additionalStakeholders) {
    await prisma.stakeholder.create({ data: s });
  }

  // Create prerequisites for TA goal
  const taPrereq1 = await prisma.prerequisite.create({
    data: {
      title: "Earn A in CS 301",
      description: "Achieve an A grade in the target course",
      status: "COMPLETED",
      confidenceScore: 95,
      goalId: taGoal.id,
    },
  });

  const taPrereq2 = await prisma.prerequisite.create({
    data: {
      title: "Build relationship with Prof. Chen",
      description: "Establish a strong working relationship through office hours and class participation",
      status: "IN_PROGRESS",
      confidenceScore: 70,
      goalId: taGoal.id,
    },
  });

  const taPrereq3 = await prisma.prerequisite.create({
    data: {
      title: "Demonstrate teaching experience",
      description: "Show evidence of teaching or tutoring ability",
      status: "NOT_STARTED",
      confidenceScore: 20,
      goalId: taGoal.id,
    },
  });

  const taPrereq4 = await prisma.prerequisite.create({
    data: {
      title: "Obtain recommendation letter",
      description: "Get a recommendation from a faculty member",
      status: "NOT_STARTED",
      confidenceScore: 40,
      goalId: taGoal.id,
    },
  });

  // Create prerequisites for startup goal
  const startupPrereq1 = await prisma.prerequisite.create({
    data: {
      title: "Complete MVP",
      description: "Build a working prototype of the AI productivity tool",
      status: "IN_PROGRESS",
      confidenceScore: 65,
      goalId: startupGoal.id,
    },
  });

  const startupPrereq2 = await prisma.prerequisite.create({
    data: {
      title: "Pitch deck finalized",
      description: "Create a compelling investor pitch deck with market data",
      status: "COMPLETED",
      confidenceScore: 90,
      goalId: startupGoal.id,
    },
  });

  const startupPrereq3 = await prisma.prerequisite.create({
    data: {
      title: "Warm intros to 5+ investors",
      description: "Get warm introductions to at least 5 angel/pre-seed investors",
      status: "IN_PROGRESS",
      confidenceScore: 35,
      goalId: startupGoal.id,
    },
  });

  // Create prerequisites for research goal
  await prisma.prerequisite.create({
    data: {
      title: "Literature review complete",
      description: "Complete a comprehensive review of related work",
      status: "IN_PROGRESS",
      confidenceScore: 55,
      goalId: researchGoal.id,
    },
  });

  await prisma.prerequisite.create({
    data: {
      title: "Experiment design approved",
      description: "Get experiment methodology approved by advisor",
      status: "NOT_STARTED",
      confidenceScore: 25,
      goalId: researchGoal.id,
    },
  });

  // Create evidence
  await prisma.evidence.create({
    data: {
      title: "A grade achieved in CS 301",
      description: "Final grade posted: A",
      source: "transcript",
      prerequisiteId: taPrereq1.id,
    },
  });

  await prisma.evidence.create({
    data: {
      title: "Office hours attendance (8 sessions)",
      description: "Regular office hours attendance documented",
      source: "meeting",
      prerequisiteId: taPrereq2.id,
      stakeholderId: profChen.id,
    },
  });

  await prisma.evidence.create({
    data: {
      title: "Pitch deck v3 completed",
      description: "Updated deck with market size and competitive analysis",
      source: "document",
      prerequisiteId: startupPrereq2.id,
    },
  });

  await prisma.evidence.create({
    data: {
      title: "Meeting with Sarah Kim at demo day",
      description: "Positive conversation, exchanged contacts",
      source: "meeting",
      stakeholderId: sarahKim.id,
    },
  });

  // Create actions
  await prisma.action.create({
    data: {
      title: "Volunteer to assist classmates in study group",
      status: "TODO",
      priority: "HIGH",
      dueDate: new Date("2025-02-15"),
      goalId: taGoal.id,
    },
  });

  await prisma.action.create({
    data: {
      title: "Schedule meeting with Prof. Chen",
      status: "TODO",
      priority: "HIGH",
      dueDate: new Date("2025-02-01"),
      goalId: taGoal.id,
    },
  });

  await prisma.action.create({
    data: {
      title: "Ask Prof. Chen for recommendation",
      status: "TODO",
      priority: "MEDIUM",
      dueDate: new Date("2025-03-01"),
      goalId: taGoal.id,
    },
  });

  await prisma.action.create({
    data: {
      title: "Complete MVP core features",
      status: "IN_PROGRESS",
      priority: "CRITICAL",
      dueDate: new Date("2025-03-15"),
      goalId: startupGoal.id,
    },
  });

  await prisma.action.create({
    data: {
      title: "Email Sarah Kim for investor intros",
      status: "TODO",
      priority: "HIGH",
      dueDate: new Date("2025-02-10"),
      goalId: startupGoal.id,
    },
  });

  await prisma.action.create({
    data: {
      title: "Schedule literature review session with Dr. Patel",
      status: "TODO",
      priority: "MEDIUM",
      dueDate: new Date("2025-02-20"),
      goalId: researchGoal.id,
    },
  });

  // Create relationships
  await prisma.relationship.create({
    data: {
      fromType: "STAKEHOLDER",
      fromId: profChen.id,
      toType: "GOAL",
      toId: taGoal.id,
      label: "can recommend for",
      stakeholderFromId: profChen.id,
      goalToId: taGoal.id,
    },
  });

  await prisma.relationship.create({
    data: {
      fromType: "STAKEHOLDER",
      fromId: sarahKim.id,
      toType: "GOAL",
      toId: startupGoal.id,
      label: "potential investor",
      stakeholderFromId: sarahKim.id,
      goalToId: startupGoal.id,
    },
  });

  await prisma.relationship.create({
    data: {
      fromType: "STAKEHOLDER",
      fromId: drPatel.id,
      toType: "GOAL",
      toId: researchGoal.id,
      label: "research advisor",
      stakeholderFromId: drPatel.id,
      goalToId: researchGoal.id,
    },
  });

  await prisma.relationship.create({
    data: {
      fromType: "GOAL",
      fromId: researchGoal.id,
      toType: "GOAL",
      toId: taGoal.id,
      label: "strengthens application",
      goalFromId: researchGoal.id,
      goalToId: taGoal.id,
    },
  });

  // Record events
  const entities = [
    { type: "GOAL" as const, id: taGoal.id, title: taGoal.title },
    { type: "GOAL" as const, id: startupGoal.id, title: startupGoal.title },
    { type: "GOAL" as const, id: researchGoal.id, title: researchGoal.title },
    { type: "STAKEHOLDER" as const, id: profChen.id, title: profChen.name },
    { type: "STAKEHOLDER" as const, id: sarahKim.id, title: sarahKim.name },
    { type: "STAKEHOLDER" as const, id: drPatel.id, title: drPatel.name },
  ];

  for (const entity of entities) {
    await prisma.event.create({
      data: {
        entityType: entity.type,
        entityId: entity.id,
        eventType: "CREATED",
        payload: { title: entity.title },
      },
    });
  }

  await prisma.event.create({
    data: {
      entityType: "PREREQUISITE",
      entityId: taPrereq1.id,
      eventType: "STATUS_CHANGED",
      payload: { from: "NOT_STARTED", to: "COMPLETED", title: taPrereq1.title },
    },
  });

  await prisma.event.create({
    data: {
      entityType: "PREREQUISITE",
      entityId: startupPrereq1.id,
      eventType: "STATUS_CHANGED",
      payload: { from: "NOT_STARTED", to: "IN_PROGRESS", title: startupPrereq1.title },
    },
  });

  console.log("Seed data created successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
