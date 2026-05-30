import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://goalos:goalos_dev@localhost:5432/goalos?schema=public";

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clean existing data
  await prisma.scheduleEvent.deleteMany();
  await prisma.calendarConnection.deleteMany();
  await prisma.event.deleteMany();
  await prisma.relationship.deleteMany();
  await prisma.evidence.deleteMany();
  await prisma.action.deleteMany();
  await prisma.prerequisite.deleteMany();
  await prisma.stakeholder.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.value.deleteMany();

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
      capabilities: [
        { type: "willingness", description: "write recommendation letter", condition: "maintain A grade and attend office hours regularly" },
        { type: "capability", description: "TA position referral", condition: "demonstrate teaching ability in study groups" },
        { type: "willingness", description: "research mentorship", condition: "commit to weekly lab meetings" },
      ],
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
      capabilities: [
        { type: "willingness", description: "pre-seed investment", condition: "working MVP with early traction metrics" },
        { type: "capability", description: "warm introductions to other VCs", condition: "strong pitch deck and clear market thesis" },
        { type: "willingness", description: "strategic advising for fundraising", condition: null },
      ],
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
      capabilities: [
        { type: "capability", description: "co-author research paper", condition: "novel contribution to graph-based reasoning" },
        { type: "willingness", description: "provide lab resources and compute", condition: "formal research collaboration agreement" },
        { type: "capability", description: "conference submission guidance", condition: null },
      ],
    },
  });

  const dad = await prisma.stakeholder.create({
    data: {
      name: "Dad",
      organization: null,
      role: "Family",
      relationshipStrength: 95,
      lastInteraction: new Date("2025-05-28"),
      notes: "Supportive of education goals, willing to help financially under conditions",
      capabilities: [
        { type: "willingness", description: "financial support for tuition", condition: "maintain 3.5 GPA" },
        { type: "willingness", description: "cover living expenses", condition: "enrolled full-time" },
        { type: "willingness", description: "fund conference travel", condition: "paper accepted at a top venue" },
      ],
    },
  });

  const mom = await prisma.stakeholder.create({
    data: {
      name: "Mom",
      organization: null,
      role: "Family",
      relationshipStrength: 95,
      lastInteraction: new Date("2025-05-29"),
      notes: "Emotional support, well-connected in healthcare industry",
      capabilities: [
        { type: "willingness", description: "emotional support and guidance", condition: null },
        { type: "capability", description: "introductions in healthcare industry", condition: "relevant to health-tech or biotech" },
        { type: "willingness", description: "co-sign apartment lease", condition: "enrolled in university" },
      ],
    },
  });

  // Suppress unused variable warnings for standalone stakeholders
  void dad;
  void mom;

  // Create additional stakeholders for realistic network
  const additionalStakeholders = [
    { name: "Lisa Wang", organization: "Accel Partners", role: "Associate", relationshipStrength: 20, lastInteraction: new Date("2024-11-01"), notes: "Brief intro at networking event", capabilities: [{ type: "capability", description: "seed-stage deal flow introductions", condition: "strong product-market fit signal" }] },
    { name: "James Rodriguez", organization: "CS Department", role: "PhD Student", relationshipStrength: 55, lastInteraction: new Date("2025-01-05"), notes: "Collaborator on side project", capabilities: [{ type: "capability", description: "peer tutoring and study group leadership", condition: null }, { type: "willingness", description: "co-author papers", condition: "shared research interest" }] },
    { name: "Emily Zhang", organization: "Google Research", role: "Research Scientist", relationshipStrength: 40, lastInteraction: new Date("2024-10-15"), notes: "Met at ICML poster session", capabilities: [{ type: "capability", description: "industry research collaboration", condition: "publishable results" }] },
    { name: "Michael Torres", organization: "Stanford AI Lab", role: "Postdoc", relationshipStrength: 35, lastInteraction: new Date("2024-09-20"), notes: "Potential co-author", capabilities: [{ type: "willingness", description: "co-author research paper", condition: "complementary expertise in NLP" }] },
    { name: "Anna Kowalski", organization: "YC", role: "Group Partner", relationshipStrength: 15, lastInteraction: new Date("2024-08-10"), notes: "Attended YC info session", capabilities: [{ type: "capability", description: "accelerator application guidance", condition: "viable startup idea with technical founder" }] },
    { name: "David Lee", organization: "Andreessen Horowitz", role: "Partner", relationshipStrength: 10, lastInteraction: new Date("2024-07-22"), notes: "Cold email, no response yet", capabilities: [{ type: "capability", description: "Series A+ fundraising", condition: "proven traction and revenue" }] },
    { name: "Rachel Green", organization: "MIT Media Lab", role: "Professor", relationshipStrength: 45, lastInteraction: new Date("2025-01-15"), notes: "Guest lecture attendee", capabilities: [{ type: "willingness", description: "academic collaboration on HCI research", condition: "relevant to human-computer interaction" }] },
    { name: "Tom Nakamura", organization: "AngelList", role: "Angel Investor", relationshipStrength: 25, lastInteraction: new Date("2024-12-01"), notes: "Connected via Sarah Kim", capabilities: [{ type: "willingness", description: "angel investment ($25-50K)", condition: "pre-seed stage with demo" }, { type: "capability", description: "introductions to angel network", condition: null }] },
    { name: "Priya Sharma", organization: "Microsoft Research", role: "Principal Researcher", relationshipStrength: 50, lastInteraction: new Date("2025-01-08"), notes: "Co-authored workshop paper", capabilities: [{ type: "capability", description: "research mentorship and publication review", condition: null }, { type: "willingness", description: "provide industry dataset access", condition: "joint research agreement" }] },
    { name: "Alex Chen", organization: "CS Department", role: "Adjunct Professor", relationshipStrength: 65, lastInteraction: new Date("2025-01-22"), notes: "TA for his class last semester", capabilities: [{ type: "willingness", description: "TA recommendation letter", condition: "demonstrated strong grading work" }, { type: "capability", description: "teaching methodology guidance", condition: null }] },
    { name: "Jessica Park", organization: "Benchmark", role: "Principal", relationshipStrength: 5, lastInteraction: new Date("2024-06-15"), notes: "LinkedIn connection only" },
    { name: "Robert Kim", organization: "IEEE", role: "Conference Chair", relationshipStrength: 30, lastInteraction: new Date("2024-11-20"), notes: "Submitted paper to his track", capabilities: [{ type: "capability", description: "conference paper submission guidance", condition: null }] },
    { name: "Maria Santos", organization: "OpenAI", role: "ML Engineer", relationshipStrength: 35, lastInteraction: new Date("2024-12-10"), notes: "Former classmate", capabilities: [{ type: "willingness", description: "technical mentorship on LLM fine-tuning", condition: null }] },
    { name: "Kevin O'Brien", organization: "CS Department", role: "Department Head", relationshipStrength: 20, lastInteraction: new Date("2024-10-01"), notes: "Brief meeting about TA program", capabilities: [{ type: "capability", description: "TA position approval", condition: "faculty recommendation and GPA above 3.5" }, { type: "capability", description: "research funding allocation", condition: "approved research proposal" }] },
    { name: "Sophia Andersson", organization: "DeepMind", role: "Research Lead", relationshipStrength: 15, lastInteraction: new Date("2024-09-05"), notes: "Cited her work in thesis", capabilities: [{ type: "capability", description: "industry research internship referral", condition: "strong ML publication record" }] },
    { name: "Chris Johnson", organization: "Founders Fund", role: "Scout", relationshipStrength: 25, lastInteraction: new Date("2024-11-30"), notes: "Warm intro from Tom", capabilities: [{ type: "willingness", description: "scout-stage investment ($50-100K)", condition: "compelling demo and market size" }] },
    { name: "Diana Wu", organization: "Stanford CS", role: "PhD Candidate", relationshipStrength: 70, lastInteraction: new Date("2025-01-18"), notes: "Close research collaborator", capabilities: [{ type: "willingness", description: "co-author and peer review papers", condition: null }, { type: "capability", description: "share GPU compute resources", condition: "reciprocal collaboration" }] },
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

  // Create user values (rank 1 = most important)
  await prisma.value.create({
    data: {
      label: "Financial Security",
      rank: 1,
      description: "Building wealth and financial independence is a top priority",
      tags: ["money", "wealth", "career", "income"],
    },
  });

  await prisma.value.create({
    data: {
      label: "Career Growth",
      rank: 2,
      description: "Advancing professionally and building expertise",
      tags: ["career", "education", "skills"],
    },
  });

  await prisma.value.create({
    data: {
      label: "Knowledge & Learning",
      rank: 3,
      description: "Continuous learning and intellectual growth",
      tags: ["education", "skills", "creative"],
    },
  });

  await prisma.value.create({
    data: {
      label: "Health & Fitness",
      rank: 4,
      description: "Maintaining physical and mental health",
      tags: ["health", "fitness", "wellness"],
    },
  });

  await prisma.value.create({
    data: {
      label: "Family",
      rank: 5,
      description: "Supporting and being present for family",
      tags: ["family", "relationships"],
    },
  });

  await prisma.value.create({
    data: {
      label: "Impact & Giving Back",
      rank: 6,
      description: "Making a positive difference in the world",
      tags: ["impact", "community"],
    },
  });

  await prisma.value.create({
    data: {
      label: "Romantic Relationships",
      rank: 7,
      description: "Finding and nurturing a meaningful romantic partnership",
      tags: ["relationships", "romantic"],
    },
  });

  // Create schedule events across multiple goals for time allocation
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  // TA Goal - study group sessions (Mon/Wed/Fri)
  for (const dayOffset of [1, 3, 5]) {
    const start = new Date(weekStart);
    start.setDate(start.getDate() + dayOffset);
    start.setHours(14, 0, 0, 0);
    const end = new Date(start);
    end.setHours(15, 0, 0, 0);
    await prisma.scheduleEvent.create({
      data: {
        title: `Study group session`,
        description: "Lead classmate study group for CS 301",
        startTime: start,
        endTime: end,
        source: "GOALOS",
        goalId: taGoal.id,
        color: "#3b82f6",
      },
    });
  }
  // TA Goal - office hours (Tuesday)
  const taOfficeHours = new Date(weekStart);
  taOfficeHours.setDate(taOfficeHours.getDate() + 2);
  taOfficeHours.setHours(10, 0, 0, 0);
  const taOfficeEnd = new Date(taOfficeHours);
  taOfficeEnd.setHours(11, 0, 0, 0);
  await prisma.scheduleEvent.create({
    data: {
      title: "Office hours with Prof. Chen",
      description: "Weekly office hours to strengthen relationship",
      startTime: taOfficeHours,
      endTime: taOfficeEnd,
      source: "GOALOS",
      goalId: taGoal.id,
      color: "#3b82f6",
    },
  });

  // Startup Goal - MVP work blocks (Mon/Tue/Thu 9-12)
  for (const dayOffset of [1, 2, 4]) {
    const start = new Date(weekStart);
    start.setDate(start.getDate() + dayOffset);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(12, 0, 0, 0);
    await prisma.scheduleEvent.create({
      data: {
        title: "MVP development sprint",
        description: "Core feature development for AI productivity tool",
        startTime: start,
        endTime: end,
        source: "GOALOS",
        goalId: startupGoal.id,
        color: "#10b981",
      },
    });
  }
  // Startup Goal - investor outreach (Wednesday)
  const investorBlock = new Date(weekStart);
  investorBlock.setDate(investorBlock.getDate() + 3);
  investorBlock.setHours(16, 0, 0, 0);
  const investorEnd = new Date(investorBlock);
  investorEnd.setHours(18, 0, 0, 0);
  await prisma.scheduleEvent.create({
    data: {
      title: "Investor outreach & follow-ups",
      description: "Email warm intros, update pitch materials",
      startTime: investorBlock,
      endTime: investorEnd,
      source: "GOALOS",
      goalId: startupGoal.id,
      color: "#10b981",
    },
  });

  // Research Goal - literature review (Tue/Thu 14-16)
  for (const dayOffset of [2, 4]) {
    const start = new Date(weekStart);
    start.setDate(start.getDate() + dayOffset);
    start.setHours(14, 0, 0, 0);
    const end = new Date(start);
    end.setHours(16, 0, 0, 0);
    await prisma.scheduleEvent.create({
      data: {
        title: "Literature review & note-taking",
        description: "Read and annotate papers for graph-based reasoning survey",
        startTime: start,
        endTime: end,
        source: "GOALOS",
        goalId: researchGoal.id,
        color: "#f59e0b",
      },
    });
  }
  // Research Goal - experiment design (Saturday morning)
  const satResearch = new Date(weekStart);
  satResearch.setDate(satResearch.getDate() + 6);
  satResearch.setHours(10, 0, 0, 0);
  const satResearchEnd = new Date(satResearch);
  satResearchEnd.setHours(13, 0, 0, 0);
  await prisma.scheduleEvent.create({
    data: {
      title: "Experiment design work",
      description: "Draft methodology section and plan experiments",
      startTime: satResearch,
      endTime: satResearchEnd,
      source: "GOALOS",
      goalId: researchGoal.id,
      color: "#f59e0b",
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
