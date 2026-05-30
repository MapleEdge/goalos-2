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

  // ─── Values (7 values, rank 1 = most important) ───────────────

  const values = await Promise.all([
    prisma.value.create({ data: { label: "Financial Security", rank: 1, description: "Building wealth and financial independence is a top priority", tags: ["money", "wealth", "career", "income"] } }),
    prisma.value.create({ data: { label: "Career Growth", rank: 2, description: "Advancing professionally and building expertise", tags: ["career", "education", "skills"] } }),
    prisma.value.create({ data: { label: "Knowledge & Learning", rank: 3, description: "Continuous learning and intellectual growth", tags: ["education", "skills", "creative"] } }),
    prisma.value.create({ data: { label: "Health & Fitness", rank: 4, description: "Maintaining physical and mental health", tags: ["health", "fitness", "wellness"] } }),
    prisma.value.create({ data: { label: "Family", rank: 5, description: "Supporting and being present for family", tags: ["family", "relationships"] } }),
    prisma.value.create({ data: { label: "Impact & Giving Back", rank: 6, description: "Making a positive difference in the world", tags: ["impact", "community"] } }),
    prisma.value.create({ data: { label: "Romantic Relationships", rank: 7, description: "Finding and nurturing a meaningful romantic partnership", tags: ["relationships", "romantic"] } }),
  ]);
  void values;

  // ─── Completed Goals (10) ─────────────────────────────────────

  const completedGoals = await Promise.all([
    // Financial Security
    prisma.goal.create({ data: {
      title: "Build $5K Emergency Fund",
      description: "Save $5,000 in a high-yield savings account as a financial safety net",
      successCriteria: "Balance of $5,000+ in HYSA",
      status: "COMPLETED",
      completedAt: new Date("2025-09-15"),
      targetDate: new Date("2025-10-01"),
    }}),
    // Career Growth
    prisma.goal.create({ data: {
      title: "Complete AWS Cloud Practitioner Certification",
      description: "Pass the AWS Certified Cloud Practitioner exam to strengthen cloud skills",
      successCriteria: "AWS certification badge received",
      status: "COMPLETED",
      completedAt: new Date("2025-06-20"),
      targetDate: new Date("2025-07-01"),
    }}),
    // Career Growth
    prisma.goal.create({ data: {
      title: "Deliver Conference Talk at LocalDevConf",
      description: "Submit and present a talk on graph-based reasoning at a local developer conference",
      successCriteria: "Talk delivered with positive audience feedback",
      status: "COMPLETED",
      completedAt: new Date("2025-11-10"),
      targetDate: new Date("2025-11-15"),
    }}),
    // Knowledge & Learning
    prisma.goal.create({ data: {
      title: "Complete Machine Learning Coursera Specialization",
      description: "Finish all 5 courses in the Andrew Ng ML specialization",
      successCriteria: "All 5 course certificates earned",
      status: "COMPLETED",
      completedAt: new Date("2025-04-01"),
      targetDate: new Date("2025-05-01"),
    }}),
    // Knowledge & Learning
    prisma.goal.create({ data: {
      title: "Read 12 Non-Fiction Books",
      description: "Read one non-fiction book per month covering tech, business, and psychology",
      successCriteria: "12 books completed with notes",
      status: "COMPLETED",
      completedAt: new Date("2025-12-28"),
      targetDate: new Date("2025-12-31"),
    }}),
    // Health & Fitness
    prisma.goal.create({ data: {
      title: "Run a 10K Race",
      description: "Train for and complete a 10K race under 55 minutes",
      successCriteria: "10K completed in under 55 minutes",
      status: "COMPLETED",
      completedAt: new Date("2025-10-05"),
      targetDate: new Date("2025-10-15"),
    }}),
    // Health & Fitness
    prisma.goal.create({ data: {
      title: "Establish Morning Meditation Habit",
      description: "Meditate for 10 minutes every morning for 90 consecutive days",
      successCriteria: "90-day streak completed",
      status: "COMPLETED",
      completedAt: new Date("2025-08-30"),
      targetDate: new Date("2025-09-01"),
    }}),
    // Family
    prisma.goal.create({ data: {
      title: "Plan Family Reunion",
      description: "Organize a family reunion with 20+ relatives during summer",
      successCriteria: "Event held with 20+ attendees",
      status: "COMPLETED",
      completedAt: new Date("2025-07-20"),
      targetDate: new Date("2025-08-01"),
    }}),
    // Impact
    prisma.goal.create({ data: {
      title: "Mentor 2 Junior Developers",
      description: "Provide weekly mentoring sessions to 2 junior developers for a semester",
      successCriteria: "Both mentees report skill improvement and complete their projects",
      status: "COMPLETED",
      completedAt: new Date("2025-12-15"),
      targetDate: new Date("2025-12-31"),
    }}),
    // Financial Security
    prisma.goal.create({ data: {
      title: "Negotiate 15% Salary Increase",
      description: "Prepare and execute a salary negotiation for a 15% raise",
      successCriteria: "Written offer with 15%+ raise",
      status: "COMPLETED",
      completedAt: new Date("2026-01-10"),
      targetDate: new Date("2026-02-01"),
    }}),
  ]);
  void completedGoals;

  // ─── Active Goals (3 per value = 21 goals) ────────────────────

  // Financial Security (rank 1)
  const investGoal = await prisma.goal.create({ data: {
    title: "Start Index Fund Portfolio",
    description: "Open a brokerage account and invest $500/month in diversified index funds",
    targetDate: new Date("2026-09-01"),
    successCriteria: "Portfolio value reaches $10K with consistent contributions",
    status: "ACTIVE",
  }});

  const freelanceGoal = await prisma.goal.create({ data: {
    title: "Launch Freelance Consulting Practice",
    description: "Land 3 paying freelance clients for AI/ML consulting on the side",
    targetDate: new Date("2026-08-01"),
    successCriteria: "3 active clients with signed contracts",
    status: "ACTIVE",
  }});

  const budgetGoal = await prisma.goal.create({ data: {
    title: "Reduce Monthly Expenses by 20%",
    description: "Audit and cut unnecessary spending to increase savings rate",
    targetDate: new Date("2026-07-01"),
    successCriteria: "Monthly expenses reduced by 20% for 3 consecutive months",
    status: "ACTIVE",
  }});

  // Career Growth (rank 2)
  const taGoal = await prisma.goal.create({ data: {
    title: "Obtain TA Position",
    description: "Secure a teaching assistant role in the Computer Science department for Fall semester",
    targetDate: new Date("2026-08-15"),
    successCriteria: "Receive official TA appointment letter",
    status: "ACTIVE",
  }});

  const startupGoal = await prisma.goal.create({ data: {
    title: "Raise Pre-Seed Round",
    description: "Close a $500K pre-seed round for the AI productivity startup",
    targetDate: new Date("2026-06-30"),
    successCriteria: "Term sheet signed, funds in bank",
    status: "ACTIVE",
  }});

  const leadershipGoal = await prisma.goal.create({ data: {
    title: "Lead Open Source Project to 500 Stars",
    description: "Grow the graph-reasoning OSS project to 500 GitHub stars with active contributors",
    targetDate: new Date("2026-12-01"),
    successCriteria: "500+ stars, 10+ external contributors",
    status: "ACTIVE",
  }});

  // Knowledge & Learning (rank 3)
  const researchGoal = await prisma.goal.create({ data: {
    title: "Publish Research Paper",
    description: "Submit and publish a paper on graph-based reasoning systems at a top-tier conference",
    targetDate: new Date("2026-12-01"),
    successCriteria: "Paper accepted at NeurIPS, ICML, or similar venue",
    status: "ACTIVE",
  }});

  const rustGoal = await prisma.goal.create({ data: {
    title: "Learn Rust Programming",
    description: "Become proficient in Rust by completing the Rustlings exercises and building a CLI tool",
    targetDate: new Date("2026-10-01"),
    successCriteria: "Rustlings completed, CLI tool published to crates.io",
    status: "ACTIVE",
  }});

  const philosophyGoal = await prisma.goal.create({ data: {
    title: "Complete Philosophy Reading List",
    description: "Read and annotate 8 foundational philosophy texts covering ethics, epistemology, and logic",
    targetDate: new Date("2026-11-01"),
    successCriteria: "8 books read with written reflections",
    status: "ACTIVE",
  }});

  // Health & Fitness (rank 4)
  const marathonGoal = await prisma.goal.create({ data: {
    title: "Train for Half Marathon",
    description: "Complete a half marathon under 2 hours, building on the 10K race completion",
    targetDate: new Date("2026-11-15"),
    successCriteria: "Half marathon completed in under 2 hours",
    status: "ACTIVE",
  }});

  const nutritionGoal = await prisma.goal.create({ data: {
    title: "Meal Prep Consistently for 3 Months",
    description: "Prepare healthy meals every Sunday for the week ahead for 12 consecutive weeks",
    targetDate: new Date("2026-09-01"),
    successCriteria: "12-week streak of meal prepping",
    status: "ACTIVE",
  }});

  const sleepGoal = await prisma.goal.create({ data: {
    title: "Fix Sleep Schedule",
    description: "Consistently sleep 7-8 hours with a 10:30pm bedtime and 6:30am wake time",
    targetDate: new Date("2026-08-01"),
    successCriteria: "30-day streak of consistent sleep schedule",
    status: "ACTIVE",
  }});

  // Family (rank 5)
  const dadGoal = await prisma.goal.create({ data: {
    title: "Weekly Video Calls with Parents",
    description: "Establish a consistent weekly video call with Mom and Dad every Sunday",
    targetDate: new Date("2026-09-01"),
    successCriteria: "12-week streak of weekly calls",
    status: "ACTIVE",
  }});

  const siblingGoal = await prisma.goal.create({ data: {
    title: "Plan Sibling Road Trip",
    description: "Organize and take a week-long road trip with siblings along the West Coast",
    targetDate: new Date("2026-08-15"),
    successCriteria: "Trip completed with at least 2 siblings",
    status: "ACTIVE",
  }});

  const familyFinanceGoal = await prisma.goal.create({ data: {
    title: "Help Parents Set Up Retirement Planning",
    description: "Research and help parents understand retirement account options and create a plan",
    targetDate: new Date("2026-10-01"),
    successCriteria: "Parents have opened retirement accounts with a contribution plan",
    status: "ACTIVE",
  }});

  // Impact & Giving Back (rank 6)
  const ossGoal = await prisma.goal.create({ data: {
    title: "Contribute to 5 Open Source Projects",
    description: "Make meaningful contributions (PRs merged) to 5 different open source ML/AI projects",
    targetDate: new Date("2026-12-01"),
    successCriteria: "5 merged PRs across 5 different repos",
    status: "ACTIVE",
  }});

  const workshopGoal = await prisma.goal.create({ data: {
    title: "Run Free Coding Workshop for Beginners",
    description: "Organize and teach a free 4-week intro to programming workshop at the local library",
    targetDate: new Date("2026-09-15"),
    successCriteria: "Workshop completed with 10+ attendees",
    status: "ACTIVE",
  }});

  const blogGoal = await prisma.goal.create({ data: {
    title: "Write 10 Technical Blog Posts",
    description: "Publish 10 in-depth technical blog posts on ML, systems design, and career advice",
    targetDate: new Date("2026-12-31"),
    successCriteria: "10 posts published with 1000+ total views",
    status: "ACTIVE",
  }});

  // Romantic Relationships (rank 7)
  const socialGoal = await prisma.goal.create({ data: {
    title: "Expand Social Circle",
    description: "Join 2 new social groups or clubs to meet new people outside of work/school",
    targetDate: new Date("2026-08-01"),
    successCriteria: "Active member of 2 new groups, attending regularly",
    status: "ACTIVE",
  }});

  const boundariesGoal = await prisma.goal.create({ data: {
    title: "Develop Healthy Relationship Boundaries",
    description: "Work through a relationship skills workbook and practice setting boundaries",
    targetDate: new Date("2026-09-01"),
    successCriteria: "Workbook completed, boundaries discussed with close friends",
    status: "ACTIVE",
  }});

  const dateGoal = await prisma.goal.create({ data: {
    title: "Go on 12 First Dates",
    description: "Actively date by going on at least one first date per month",
    targetDate: new Date("2026-12-31"),
    successCriteria: "12 first dates completed",
    status: "ACTIVE",
  }});

  // ─── Stakeholders ─────────────────────────────────────────────

  const profChen = await prisma.stakeholder.create({
    data: {
      name: "Prof. Chen",
      organization: "CS Department",
      role: "Professor, CS 301",
      relationshipStrength: 75,
      lastInteraction: new Date("2026-04-20"),
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
      lastInteraction: new Date("2026-02-15"),
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
      lastInteraction: new Date("2026-03-10"),
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
      lastInteraction: new Date("2026-05-28"),
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
      lastInteraction: new Date("2026-05-29"),
      notes: "Emotional support, well-connected in healthcare industry",
      capabilities: [
        { type: "willingness", description: "emotional support and guidance", condition: null },
        { type: "capability", description: "introductions in healthcare industry", condition: "relevant to health-tech or biotech" },
        { type: "willingness", description: "co-sign apartment lease", condition: "enrolled in university" },
      ],
    },
  });

  void dad;
  void mom;

  const additionalStakeholders = [
    { name: "Lisa Wang", organization: "Accel Partners", role: "Associate", relationshipStrength: 20, lastInteraction: new Date("2025-11-01"), notes: "Brief intro at networking event", capabilities: [{ type: "capability", description: "seed-stage deal flow introductions", condition: "strong product-market fit signal" }] },
    { name: "James Rodriguez", organization: "CS Department", role: "PhD Student", relationshipStrength: 55, lastInteraction: new Date("2026-03-05"), notes: "Collaborator on side project", capabilities: [{ type: "capability", description: "peer tutoring and study group leadership", condition: null }, { type: "willingness", description: "co-author papers", condition: "shared research interest" }] },
    { name: "Emily Zhang", organization: "Google Research", role: "Research Scientist", relationshipStrength: 40, lastInteraction: new Date("2025-10-15"), notes: "Met at ICML poster session", capabilities: [{ type: "capability", description: "industry research collaboration", condition: "publishable results" }] },
    { name: "Michael Torres", organization: "Stanford AI Lab", role: "Postdoc", relationshipStrength: 35, lastInteraction: new Date("2025-09-20"), notes: "Potential co-author", capabilities: [{ type: "willingness", description: "co-author research paper", condition: "complementary expertise in NLP" }] },
    { name: "Anna Kowalski", organization: "YC", role: "Group Partner", relationshipStrength: 15, lastInteraction: new Date("2025-08-10"), notes: "Attended YC info session", capabilities: [{ type: "capability", description: "accelerator application guidance", condition: "viable startup idea with technical founder" }] },
    { name: "Diana Wu", organization: "Stanford CS", role: "PhD Candidate", relationshipStrength: 70, lastInteraction: new Date("2026-04-18"), notes: "Close research collaborator", capabilities: [{ type: "willingness", description: "co-author and peer review papers", condition: null }, { type: "capability", description: "share GPU compute resources", condition: "reciprocal collaboration" }] },
  ];

  for (const s of additionalStakeholders) {
    await prisma.stakeholder.create({ data: s });
  }

  // ─── Prerequisites ────────────────────────────────────────────

  // TA Goal
  const taPrereq1 = await prisma.prerequisite.create({ data: { title: "Earn A in CS 301", description: "Achieve an A grade in the target course", status: "COMPLETED", confidenceScore: 95, goalId: taGoal.id } });
  await prisma.prerequisite.create({ data: { title: "Build relationship with Prof. Chen", description: "Establish a strong working relationship through office hours", status: "IN_PROGRESS", confidenceScore: 70, goalId: taGoal.id } });
  await prisma.prerequisite.create({ data: { title: "Demonstrate teaching experience", description: "Show evidence of teaching or tutoring ability", status: "NOT_STARTED", confidenceScore: 20, goalId: taGoal.id } });
  await prisma.prerequisite.create({ data: { title: "Obtain recommendation letter", description: "Get a recommendation from a faculty member", status: "NOT_STARTED", confidenceScore: 40, goalId: taGoal.id } });

  // Startup Goal
  const startupPrereq1 = await prisma.prerequisite.create({ data: { title: "Complete MVP", description: "Build a working prototype of the AI productivity tool", status: "IN_PROGRESS", confidenceScore: 65, goalId: startupGoal.id } });
  const startupPrereq2 = await prisma.prerequisite.create({ data: { title: "Pitch deck finalized", description: "Create a compelling investor pitch deck with market data", status: "COMPLETED", confidenceScore: 90, goalId: startupGoal.id } });
  await prisma.prerequisite.create({ data: { title: "Warm intros to 5+ investors", description: "Get warm introductions to at least 5 angel/pre-seed investors", status: "IN_PROGRESS", confidenceScore: 35, goalId: startupGoal.id } });

  // Research Goal
  await prisma.prerequisite.create({ data: { title: "Literature review complete", description: "Complete a comprehensive review of related work", status: "IN_PROGRESS", confidenceScore: 55, goalId: researchGoal.id } });
  await prisma.prerequisite.create({ data: { title: "Experiment design approved", description: "Get experiment methodology approved by advisor", status: "NOT_STARTED", confidenceScore: 25, goalId: researchGoal.id } });

  // Investment Goal
  await prisma.prerequisite.create({ data: { title: "Open brokerage account", description: "Research and open an account at Fidelity or Vanguard", status: "COMPLETED", confidenceScore: 100, goalId: investGoal.id } });
  await prisma.prerequisite.create({ data: { title: "Set up automatic transfers", description: "Configure $500/month auto-invest", status: "IN_PROGRESS", confidenceScore: 60, goalId: investGoal.id } });

  // Marathon Goal
  await prisma.prerequisite.create({ data: { title: "Build base mileage to 20 mi/week", description: "Gradually increase weekly running volume", status: "IN_PROGRESS", confidenceScore: 50, goalId: marathonGoal.id } });
  await prisma.prerequisite.create({ data: { title: "Register for race", description: "Sign up for a half marathon event", status: "NOT_STARTED", confidenceScore: 30, goalId: marathonGoal.id } });

  // Rust Goal
  await prisma.prerequisite.create({ data: { title: "Complete Rustlings exercises", description: "Work through all Rustlings exercises", status: "IN_PROGRESS", confidenceScore: 45, goalId: rustGoal.id } });

  // ─── Evidence ─────────────────────────────────────────────────

  await prisma.evidence.create({ data: { title: "A grade achieved in CS 301", description: "Final grade posted: A", source: "transcript", prerequisiteId: taPrereq1.id } });
  await prisma.evidence.create({ data: { title: "Pitch deck v3 completed", description: "Updated deck with market size and competitive analysis", source: "document", prerequisiteId: startupPrereq2.id } });
  await prisma.evidence.create({ data: { title: "Meeting with Sarah Kim at demo day", description: "Positive conversation, exchanged contacts", source: "meeting", stakeholderId: sarahKim.id } });

  // ─── Actions ──────────────────────────────────────────────────

  await prisma.action.create({ data: { title: "Volunteer to assist classmates in study group", status: "TODO", priority: "HIGH", dueDate: new Date("2026-06-15"), goalId: taGoal.id } });
  await prisma.action.create({ data: { title: "Schedule meeting with Prof. Chen", status: "TODO", priority: "HIGH", dueDate: new Date("2026-06-01"), goalId: taGoal.id } });
  await prisma.action.create({ data: { title: "Ask Prof. Chen for recommendation", status: "TODO", priority: "MEDIUM", dueDate: new Date("2026-07-01"), goalId: taGoal.id } });
  await prisma.action.create({ data: { title: "Complete MVP core features", status: "IN_PROGRESS", priority: "CRITICAL", dueDate: new Date("2026-07-15"), goalId: startupGoal.id } });
  await prisma.action.create({ data: { title: "Email Sarah Kim for investor intros", status: "TODO", priority: "HIGH", dueDate: new Date("2026-06-10"), goalId: startupGoal.id } });
  await prisma.action.create({ data: { title: "Schedule literature review session with Dr. Patel", status: "TODO", priority: "MEDIUM", dueDate: new Date("2026-06-20"), goalId: researchGoal.id } });
  await prisma.action.create({ data: { title: "Research index fund allocation strategies", status: "TODO", priority: "MEDIUM", dueDate: new Date("2026-06-15"), goalId: investGoal.id } });
  await prisma.action.create({ data: { title: "Create meal prep plan for week 1", status: "TODO", priority: "MEDIUM", dueDate: new Date("2026-06-08"), goalId: nutritionGoal.id } });
  await prisma.action.create({ data: { title: "Draft first blog post outline", status: "TODO", priority: "LOW", dueDate: new Date("2026-06-30"), goalId: blogGoal.id } });

  // ─── Relationships ────────────────────────────────────────────

  await prisma.relationship.create({ data: { fromType: "STAKEHOLDER", fromId: profChen.id, toType: "GOAL", toId: taGoal.id, label: "can recommend for", stakeholderFromId: profChen.id, goalToId: taGoal.id } });
  await prisma.relationship.create({ data: { fromType: "STAKEHOLDER", fromId: sarahKim.id, toType: "GOAL", toId: startupGoal.id, label: "potential investor", stakeholderFromId: sarahKim.id, goalToId: startupGoal.id } });
  await prisma.relationship.create({ data: { fromType: "STAKEHOLDER", fromId: drPatel.id, toType: "GOAL", toId: researchGoal.id, label: "research advisor", stakeholderFromId: drPatel.id, goalToId: researchGoal.id } });
  await prisma.relationship.create({ data: { fromType: "GOAL", fromId: researchGoal.id, toType: "GOAL", toId: taGoal.id, label: "strengthens application", goalFromId: researchGoal.id, goalToId: taGoal.id } });

  // ─── Events ───────────────────────────────────────────────────

  const entities = [
    { type: "GOAL" as const, id: taGoal.id, title: taGoal.title },
    { type: "GOAL" as const, id: startupGoal.id, title: startupGoal.title },
    { type: "GOAL" as const, id: researchGoal.id, title: researchGoal.title },
    { type: "STAKEHOLDER" as const, id: profChen.id, title: profChen.name },
    { type: "STAKEHOLDER" as const, id: sarahKim.id, title: sarahKim.name },
    { type: "STAKEHOLDER" as const, id: drPatel.id, title: drPatel.name },
  ];

  for (const entity of entities) {
    await prisma.event.create({ data: { entityType: entity.type, entityId: entity.id, eventType: "CREATED", payload: { title: entity.title } } });
  }

  await prisma.event.create({ data: { entityType: "PREREQUISITE", entityId: taPrereq1.id, eventType: "STATUS_CHANGED", payload: { from: "NOT_STARTED", to: "COMPLETED", title: taPrereq1.title } } });
  await prisma.event.create({ data: { entityType: "PREREQUISITE", entityId: startupPrereq1.id, eventType: "STATUS_CHANGED", payload: { from: "NOT_STARTED", to: "IN_PROGRESS", title: startupPrereq1.title } } });

  // ─── Schedule Events ──────────────────────────────────────────

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
    await prisma.scheduleEvent.create({ data: { title: "Study group session", description: "Lead classmate study group for CS 301", startTime: start, endTime: end, source: "GOALOS", goalId: taGoal.id, color: "#3b82f6" } });
  }

  // TA Goal - office hours (Tuesday)
  const taOfficeHours = new Date(weekStart);
  taOfficeHours.setDate(taOfficeHours.getDate() + 2);
  taOfficeHours.setHours(10, 0, 0, 0);
  const taOfficeEnd = new Date(taOfficeHours);
  taOfficeEnd.setHours(11, 0, 0, 0);
  await prisma.scheduleEvent.create({ data: { title: "Office hours with Prof. Chen", description: "Weekly office hours to strengthen relationship", startTime: taOfficeHours, endTime: taOfficeEnd, source: "GOALOS", goalId: taGoal.id, color: "#3b82f6" } });

  // Startup Goal - MVP work blocks (Mon/Tue/Thu 9-12)
  for (const dayOffset of [1, 2, 4]) {
    const start = new Date(weekStart);
    start.setDate(start.getDate() + dayOffset);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(12, 0, 0, 0);
    await prisma.scheduleEvent.create({ data: { title: "MVP development sprint", description: "Core feature development for AI productivity tool", startTime: start, endTime: end, source: "GOALOS", goalId: startupGoal.id, color: "#10b981" } });
  }

  // Startup Goal - investor outreach (Wednesday)
  const investorBlock = new Date(weekStart);
  investorBlock.setDate(investorBlock.getDate() + 3);
  investorBlock.setHours(16, 0, 0, 0);
  const investorEnd = new Date(investorBlock);
  investorEnd.setHours(18, 0, 0, 0);
  await prisma.scheduleEvent.create({ data: { title: "Investor outreach & follow-ups", description: "Email warm intros, update pitch materials", startTime: investorBlock, endTime: investorEnd, source: "GOALOS", goalId: startupGoal.id, color: "#10b981" } });

  // Research Goal - literature review (Tue/Thu 14-16)
  for (const dayOffset of [2, 4]) {
    const start = new Date(weekStart);
    start.setDate(start.getDate() + dayOffset);
    start.setHours(14, 0, 0, 0);
    const end = new Date(start);
    end.setHours(16, 0, 0, 0);
    await prisma.scheduleEvent.create({ data: { title: "Literature review & note-taking", description: "Read and annotate papers for graph-based reasoning survey", startTime: start, endTime: end, source: "GOALOS", goalId: researchGoal.id, color: "#f59e0b" } });
  }

  // Research Goal - experiment design (Saturday morning)
  const satResearch = new Date(weekStart);
  satResearch.setDate(satResearch.getDate() + 6);
  satResearch.setHours(10, 0, 0, 0);
  const satResearchEnd = new Date(satResearch);
  satResearchEnd.setHours(13, 0, 0, 0);
  await prisma.scheduleEvent.create({ data: { title: "Experiment design work", description: "Draft methodology section and plan experiments", startTime: satResearch, endTime: satResearchEnd, source: "GOALOS", goalId: researchGoal.id, color: "#f59e0b" } });

  // Marathon training (Mon/Wed/Sat morning)
  for (const dayOffset of [1, 3, 6]) {
    const start = new Date(weekStart);
    start.setDate(start.getDate() + dayOffset);
    start.setHours(6, 30, 0, 0);
    const end = new Date(start);
    end.setHours(7, 30, 0, 0);
    await prisma.scheduleEvent.create({ data: { title: "Running training", description: "Half marathon training run", startTime: start, endTime: end, source: "GOALOS", goalId: marathonGoal.id, color: "#ef4444" } });
  }

  // Meal prep (Sunday afternoon)
  const mealPrepStart = new Date(weekStart);
  mealPrepStart.setHours(15, 0, 0, 0);
  const mealPrepEnd = new Date(mealPrepStart);
  mealPrepEnd.setHours(17, 0, 0, 0);
  await prisma.scheduleEvent.create({ data: { title: "Weekly meal prep", description: "Prepare healthy meals for the week", startTime: mealPrepStart, endTime: mealPrepEnd, source: "GOALOS", goalId: nutritionGoal.id, color: "#8b5cf6" } });

  // Suppress unused variable warnings
  void freelanceGoal;
  void budgetGoal;
  void leadershipGoal;
  void rustGoal;
  void philosophyGoal;
  void nutritionGoal;
  void sleepGoal;
  void dadGoal;
  void siblingGoal;
  void familyFinanceGoal;
  void ossGoal;
  void workshopGoal;
  void blogGoal;
  void socialGoal;
  void boundariesGoal;
  void dateGoal;

  console.log("Seed data created successfully");
  console.log("  - 7 values");
  console.log("  - 10 completed goals");
  console.log("  - 21 active goals (3 per value)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
