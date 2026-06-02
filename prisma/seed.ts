import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://goalos:goalos_dev@localhost:5432/goalos?schema=public'

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Clean existing data
  await prisma.resourceFlow.deleteMany()
  await prisma.resourceType.deleteMany()
  await prisma.controlDimension.deleteMany()
  await prisma.opportunity.deleteMany()
  await prisma.vehicleGoal.deleteMany()
  await prisma.vehicle.deleteMany()
  await prisma.scheduleEvent.deleteMany()
  await prisma.calendarConnection.deleteMany()
  await prisma.event.deleteMany()
  await prisma.relationship.deleteMany()
  await prisma.evidence.deleteMany()
  await prisma.action.deleteMany()
  await prisma.prerequisite.deleteMany()
  await prisma.stakeholder.deleteMany()
  await prisma.goal.deleteMany()
  await prisma.value.deleteMany()

  // ─── Values (7 values, rank 1 = most important) ───────────────

  const values = await Promise.all([
    prisma.value.create({
      data: {
        label: 'Financial Security',
        rank: 1,
        description:
          'Building wealth and financial independence is a top priority',
        tags: ['money', 'wealth', 'career', 'income'],
      },
    }),
    prisma.value.create({
      data: {
        label: 'Career Growth',
        rank: 2,
        description: 'Advancing professionally and building expertise',
        tags: ['career', 'education', 'skills'],
      },
    }),
    prisma.value.create({
      data: {
        label: 'Knowledge & Learning',
        rank: 3,
        description: 'Continuous learning and intellectual growth',
        tags: ['education', 'skills', 'creative'],
      },
    }),
    prisma.value.create({
      data: {
        label: 'Health & Fitness',
        rank: 4,
        description: 'Maintaining physical and mental health',
        tags: ['health', 'fitness', 'wellness'],
      },
    }),
    prisma.value.create({
      data: {
        label: 'Family',
        rank: 5,
        description: 'Supporting and being present for family',
        tags: ['family', 'relationships'],
      },
    }),
    prisma.value.create({
      data: {
        label: 'Impact & Giving Back',
        rank: 6,
        description: 'Making a positive difference in the world',
        tags: ['impact', 'community'],
      },
    }),
    prisma.value.create({
      data: {
        label: 'Romantic Relationships',
        rank: 7,
        description: 'Finding and nurturing a meaningful romantic partnership',
        tags: ['relationships', 'romantic'],
      },
    }),
  ])

  // ─── Completed Goals (10) ─────────────────────────────────────

  const completedGoals = await Promise.all([
    // Financial Security
    prisma.goal.create({
      data: {
        valueId: values[0].id,
        title: 'Build $5K Emergency Fund',
        description:
          'Save $5,000 in a high-yield savings account as a financial safety net',
        successCriteria: 'Balance of $5,000+ in HYSA',
        status: 'COMPLETED',
        completedAt: new Date('2025-09-15'),
        targetDate: new Date('2025-10-01'),
      },
    }),
    // Career Growth
    prisma.goal.create({
      data: {
        valueId: values[1].id,
        title: 'Complete AWS Cloud Practitioner Certification',
        description:
          'Pass the AWS Certified Cloud Practitioner exam to strengthen cloud skills',
        successCriteria: 'AWS certification badge received',
        status: 'COMPLETED',
        completedAt: new Date('2025-06-20'),
        targetDate: new Date('2025-07-01'),
      },
    }),
    // Career Growth
    prisma.goal.create({
      data: {
        valueId: values[1].id,
        title: 'Deliver Conference Talk at LocalDevConf',
        description:
          'Submit and present a talk on graph-based reasoning at a local developer conference',
        successCriteria: 'Talk delivered with positive audience feedback',
        status: 'COMPLETED',
        completedAt: new Date('2025-11-10'),
        targetDate: new Date('2025-11-15'),
      },
    }),
    // Knowledge & Learning
    prisma.goal.create({
      data: {
        valueId: values[2].id,
        title: 'Complete Machine Learning Coursera Specialization',
        description: 'Finish all 5 courses in the Andrew Ng ML specialization',
        successCriteria: 'All 5 course certificates earned',
        status: 'COMPLETED',
        completedAt: new Date('2025-04-01'),
        targetDate: new Date('2025-05-01'),
      },
    }),
    // Knowledge & Learning
    prisma.goal.create({
      data: {
        valueId: values[2].id,
        title: 'Read 12 Non-Fiction Books',
        description:
          'Read one non-fiction book per month covering tech, business, and psychology',
        successCriteria: '12 books completed with notes',
        status: 'COMPLETED',
        completedAt: new Date('2025-12-28'),
        targetDate: new Date('2025-12-31'),
      },
    }),
    // Health & Fitness
    prisma.goal.create({
      data: {
        valueId: values[3].id,
        title: 'Run a 10K Race',
        description: 'Train for and complete a 10K race under 55 minutes',
        successCriteria: '10K completed in under 55 minutes',
        status: 'COMPLETED',
        completedAt: new Date('2025-10-05'),
        targetDate: new Date('2025-10-15'),
      },
    }),
    // Health & Fitness
    prisma.goal.create({
      data: {
        valueId: values[3].id,
        title: 'Establish Morning Meditation Habit',
        description:
          'Meditate for 10 minutes every morning for 90 consecutive days',
        successCriteria: '90-day streak completed',
        status: 'COMPLETED',
        completedAt: new Date('2025-08-30'),
        targetDate: new Date('2025-09-01'),
      },
    }),
    // Family
    prisma.goal.create({
      data: {
        valueId: values[4].id,
        title: 'Plan Family Reunion',
        description:
          'Organize a family reunion with 20+ relatives during summer',
        successCriteria: 'Event held with 20+ attendees',
        status: 'COMPLETED',
        completedAt: new Date('2025-07-20'),
        targetDate: new Date('2025-08-01'),
      },
    }),
    // Impact
    prisma.goal.create({
      data: {
        valueId: values[5].id,
        title: 'Mentor 2 Junior Developers',
        description:
          'Provide weekly mentoring sessions to 2 junior developers for a semester',
        successCriteria:
          'Both mentees report skill improvement and complete their projects',
        status: 'COMPLETED',
        completedAt: new Date('2025-12-15'),
        targetDate: new Date('2025-12-31'),
      },
    }),
    // Financial Security
    prisma.goal.create({
      data: {
        valueId: values[0].id,
        title: 'Negotiate 15% Salary Increase',
        description: 'Prepare and execute a salary negotiation for a 15% raise',
        successCriteria: 'Written offer with 15%+ raise',
        status: 'COMPLETED',
        completedAt: new Date('2026-01-10'),
        targetDate: new Date('2026-02-01'),
      },
    }),
  ])
  void completedGoals

  // ─── Active Goals (3 per value = 21 goals) ────────────────────

  // Financial Security (rank 1)
  const investGoal = await prisma.goal.create({
    data: {
      valueId: values[0].id,
      title: 'Start Index Fund Portfolio',
      description:
        'Open a brokerage account and invest $500/month in diversified index funds',
      targetDate: new Date('2026-09-01'),
      successCriteria:
        'Portfolio value reaches $10K with consistent contributions',
      status: 'ACTIVE',
    },
  })

  const freelanceGoal = await prisma.goal.create({
    data: {
      valueId: values[0].id,
      title: 'Launch Freelance Consulting Practice',
      description:
        'Land 3 paying freelance clients for AI/ML consulting on the side',
      targetDate: new Date('2026-08-01'),
      successCriteria: '3 active clients with signed contracts',
      status: 'ACTIVE',
    },
  })

  const budgetGoal = await prisma.goal.create({
    data: {
      valueId: values[0].id,
      title: 'Reduce Monthly Expenses by 20%',
      description:
        'Audit and cut unnecessary spending to increase savings rate',
      targetDate: new Date('2026-07-01'),
      successCriteria:
        'Monthly expenses reduced by 20% for 3 consecutive months',
      status: 'ACTIVE',
    },
  })

  // Career Growth (rank 2)
  const taGoal = await prisma.goal.create({
    data: {
      valueId: values[1].id,
      title: 'Obtain TA Position',
      description:
        'Secure a teaching assistant role in the Computer Science department for Fall semester',
      targetDate: new Date('2026-08-15'),
      successCriteria: 'Receive official TA appointment letter',
      status: 'ACTIVE',
    },
  })

  const startupGoal = await prisma.goal.create({
    data: {
      valueId: values[1].id,
      title: 'Raise Pre-Seed Round',
      description:
        'Close a $500K pre-seed round for the AI productivity startup',
      targetDate: new Date('2026-06-30'),
      successCriteria: 'Term sheet signed, funds in bank',
      status: 'ACTIVE',
    },
  })

  const leadershipGoal = await prisma.goal.create({
    data: {
      valueId: values[1].id,
      title: 'Lead Open Source Project to 500 Stars',
      description:
        'Grow the graph-reasoning OSS project to 500 GitHub stars with active contributors',
      targetDate: new Date('2026-12-01'),
      successCriteria: '500+ stars, 10+ external contributors',
      status: 'ACTIVE',
    },
  })

  // Knowledge & Learning (rank 3)
  const researchGoal = await prisma.goal.create({
    data: {
      valueId: values[2].id,
      title: 'Publish Research Paper',
      description:
        'Submit and publish a paper on graph-based reasoning systems at a top-tier conference',
      targetDate: new Date('2026-12-01'),
      successCriteria: 'Paper accepted at NeurIPS, ICML, or similar venue',
      status: 'ACTIVE',
    },
  })

  const rustGoal = await prisma.goal.create({
    data: {
      valueId: values[2].id,
      title: 'Learn Rust Programming',
      description:
        'Become proficient in Rust by completing the Rustlings exercises and building a CLI tool',
      targetDate: new Date('2026-10-01'),
      successCriteria: 'Rustlings completed, CLI tool published to crates.io',
      status: 'ACTIVE',
    },
  })

  const philosophyGoal = await prisma.goal.create({
    data: {
      valueId: values[2].id,
      title: 'Complete Philosophy Reading List',
      description:
        'Read and annotate 8 foundational philosophy texts covering ethics, epistemology, and logic',
      targetDate: new Date('2026-11-01'),
      successCriteria: '8 books read with written reflections',
      status: 'ACTIVE',
    },
  })

  // Health & Fitness (rank 4)
  const marathonGoal = await prisma.goal.create({
    data: {
      valueId: values[3].id,
      title: 'Train for Half Marathon',
      description:
        'Complete a half marathon under 2 hours, building on the 10K race completion',
      targetDate: new Date('2026-11-15'),
      successCriteria: 'Half marathon completed in under 2 hours',
      status: 'ACTIVE',
    },
  })

  const nutritionGoal = await prisma.goal.create({
    data: {
      valueId: values[3].id,
      title: 'Meal Prep Consistently for 3 Months',
      description:
        'Prepare healthy meals every Sunday for the week ahead for 12 consecutive weeks',
      targetDate: new Date('2026-09-01'),
      successCriteria: '12-week streak of meal prepping',
      status: 'ACTIVE',
    },
  })

  const sleepGoal = await prisma.goal.create({
    data: {
      valueId: values[3].id,
      title: 'Fix Sleep Schedule',
      description:
        'Consistently sleep 7-8 hours with a 10:30pm bedtime and 6:30am wake time',
      targetDate: new Date('2026-08-01'),
      successCriteria: '30-day streak of consistent sleep schedule',
      status: 'ACTIVE',
    },
  })

  // Family (rank 5)
  const dadGoal = await prisma.goal.create({
    data: {
      valueId: values[4].id,
      title: 'Weekly Video Calls with Parents',
      description:
        'Establish a consistent weekly video call with Mom and Dad every Sunday',
      targetDate: new Date('2026-09-01'),
      successCriteria: '12-week streak of weekly calls',
      status: 'ACTIVE',
    },
  })

  const siblingGoal = await prisma.goal.create({
    data: {
      valueId: values[4].id,
      title: 'Plan Sibling Road Trip',
      description:
        'Organize and take a week-long road trip with siblings along the West Coast',
      targetDate: new Date('2026-08-15'),
      successCriteria: 'Trip completed with at least 2 siblings',
      status: 'ACTIVE',
    },
  })

  const familyFinanceGoal = await prisma.goal.create({
    data: {
      valueId: values[4].id,
      title: 'Help Parents Set Up Retirement Planning',
      description:
        'Research and help parents understand retirement account options and create a plan',
      targetDate: new Date('2026-10-01'),
      successCriteria:
        'Parents have opened retirement accounts with a contribution plan',
      status: 'ACTIVE',
    },
  })

  // Impact & Giving Back (rank 6)
  const ossGoal = await prisma.goal.create({
    data: {
      valueId: values[5].id,
      title: 'Contribute to 5 Open Source Projects',
      description:
        'Make meaningful contributions (PRs merged) to 5 different open source ML/AI projects',
      targetDate: new Date('2026-12-01'),
      successCriteria: '5 merged PRs across 5 different repos',
      status: 'ACTIVE',
    },
  })

  const workshopGoal = await prisma.goal.create({
    data: {
      valueId: values[5].id,
      title: 'Run Free Coding Workshop for Beginners',
      description:
        'Organize and teach a free 4-week intro to programming workshop at the local library',
      targetDate: new Date('2026-09-15'),
      successCriteria: 'Workshop completed with 10+ attendees',
      status: 'ACTIVE',
    },
  })

  const blogGoal = await prisma.goal.create({
    data: {
      valueId: values[5].id,
      title: 'Write 10 Technical Blog Posts',
      description:
        'Publish 10 in-depth technical blog posts on ML, systems design, and career advice',
      targetDate: new Date('2026-12-31'),
      successCriteria: '10 posts published with 1000+ total views',
      status: 'ACTIVE',
    },
  })

  // Romantic Relationships (rank 7)
  const socialGoal = await prisma.goal.create({
    data: {
      valueId: values[6].id,
      title: 'Expand Social Circle',
      description:
        'Join 2 new social groups or clubs to meet new people outside of work/school',
      targetDate: new Date('2026-08-01'),
      successCriteria: 'Active member of 2 new groups, attending regularly',
      status: 'ACTIVE',
    },
  })

  const boundariesGoal = await prisma.goal.create({
    data: {
      valueId: values[6].id,
      title: 'Develop Healthy Relationship Boundaries',
      description:
        'Work through a relationship skills workbook and practice setting boundaries',
      targetDate: new Date('2026-09-01'),
      successCriteria:
        'Workbook completed, boundaries discussed with close friends',
      status: 'ACTIVE',
    },
  })

  const dateGoal = await prisma.goal.create({
    data: {
      valueId: values[6].id,
      title: 'Go on 12 First Dates',
      description:
        'Actively date by going on at least one first date per month',
      targetDate: new Date('2026-12-31'),
      successCriteria: '12 first dates completed',
      status: 'ACTIVE',
    },
  })

  // ─── Stakeholders ─────────────────────────────────────────────

  const profChen = await prisma.stakeholder.create({
    data: {
      name: 'Prof. Chen',
      organization: 'CS Department',
      role: 'Professor, CS 301',
      relationshipStrength: 75,
      lastInteraction: new Date('2026-04-20'),
      notes: 'Very supportive, met during office hours multiple times',
      capabilities: [
        {
          type: 'willingness',
          description: 'write recommendation letter',
          condition: 'maintain A grade and attend office hours regularly',
        },
        {
          type: 'capability',
          description: 'TA position referral',
          condition: 'demonstrate teaching ability in study groups',
        },
        {
          type: 'willingness',
          description: 'research mentorship',
          condition: 'commit to weekly lab meetings',
        },
      ],
    },
  })

  const sarahKim = await prisma.stakeholder.create({
    data: {
      name: 'Sarah Kim',
      organization: 'Sequoia Capital',
      role: 'Venture Partner',
      relationshipStrength: 30,
      lastInteraction: new Date('2026-02-15'),
      notes: 'Met at YC Demo Day, expressed interest in AI tools',
      capabilities: [
        {
          type: 'willingness',
          description: 'pre-seed investment',
          condition: 'working MVP with early traction metrics',
        },
        {
          type: 'capability',
          description: 'warm introductions to other VCs',
          condition: 'strong pitch deck and clear market thesis',
        },
        {
          type: 'willingness',
          description: 'strategic advising for fundraising',
          condition: null,
        },
      ],
    },
  })

  const drPatel = await prisma.stakeholder.create({
    data: {
      name: 'Dr. Patel',
      organization: 'ML Research Lab',
      role: 'Lab Director',
      relationshipStrength: 60,
      lastInteraction: new Date('2026-03-10'),
      notes: 'Potential research advisor, strong publication record',
      capabilities: [
        {
          type: 'capability',
          description: 'co-author research paper',
          condition: 'novel contribution to graph-based reasoning',
        },
        {
          type: 'willingness',
          description: 'provide lab resources and compute',
          condition: 'formal research collaboration agreement',
        },
        {
          type: 'capability',
          description: 'conference submission guidance',
          condition: null,
        },
      ],
    },
  })

  const dad = await prisma.stakeholder.create({
    data: {
      name: 'Dad',
      organization: null,
      role: 'Family',
      relationshipStrength: 95,
      lastInteraction: new Date('2026-05-28'),
      notes:
        'Supportive of education goals, willing to help financially under conditions',
      capabilities: [
        {
          type: 'willingness',
          description: 'financial support for tuition',
          condition: 'maintain 3.5 GPA',
        },
        {
          type: 'willingness',
          description: 'cover living expenses',
          condition: 'enrolled full-time',
        },
        {
          type: 'willingness',
          description: 'fund conference travel',
          condition: 'paper accepted at a top venue',
        },
      ],
    },
  })

  const mom = await prisma.stakeholder.create({
    data: {
      name: 'Mom',
      organization: null,
      role: 'Family',
      relationshipStrength: 95,
      lastInteraction: new Date('2026-05-29'),
      notes: 'Emotional support, well-connected in healthcare industry',
      capabilities: [
        {
          type: 'willingness',
          description: 'emotional support and guidance',
          condition: null,
        },
        {
          type: 'capability',
          description: 'introductions in healthcare industry',
          condition: 'relevant to health-tech or biotech',
        },
        {
          type: 'willingness',
          description: 'co-sign apartment lease',
          condition: 'enrolled in university',
        },
      ],
    },
  })

  // dad and mom used below in value connections

  const additionalStakeholders = [
    {
      name: 'Lisa Wang',
      organization: 'Accel Partners',
      role: 'Associate',
      relationshipStrength: 20,
      lastInteraction: new Date('2025-11-01'),
      notes: 'Brief intro at networking event',
      capabilities: [
        {
          type: 'capability',
          description: 'seed-stage deal flow introductions',
          condition: 'strong product-market fit signal',
        },
      ],
    },
    {
      name: 'James Rodriguez',
      organization: 'CS Department',
      role: 'PhD Student',
      relationshipStrength: 55,
      lastInteraction: new Date('2026-03-05'),
      notes: 'Collaborator on side project',
      capabilities: [
        {
          type: 'capability',
          description: 'peer tutoring and study group leadership',
          condition: null,
        },
        {
          type: 'willingness',
          description: 'co-author papers',
          condition: 'shared research interest',
        },
      ],
    },
    {
      name: 'Emily Zhang',
      organization: 'Google Research',
      role: 'Research Scientist',
      relationshipStrength: 40,
      lastInteraction: new Date('2025-10-15'),
      notes: 'Met at ICML poster session',
      capabilities: [
        {
          type: 'capability',
          description: 'industry research collaboration',
          condition: 'publishable results',
        },
      ],
    },
    {
      name: 'Michael Torres',
      organization: 'Stanford AI Lab',
      role: 'Postdoc',
      relationshipStrength: 35,
      lastInteraction: new Date('2025-09-20'),
      notes: 'Potential co-author',
      capabilities: [
        {
          type: 'willingness',
          description: 'co-author research paper',
          condition: 'complementary expertise in NLP',
        },
      ],
    },
    {
      name: 'Anna Kowalski',
      organization: 'YC',
      role: 'Group Partner',
      relationshipStrength: 15,
      lastInteraction: new Date('2025-08-10'),
      notes: 'Attended YC info session',
      capabilities: [
        {
          type: 'capability',
          description: 'accelerator application guidance',
          condition: 'viable startup idea with technical founder',
        },
      ],
    },
    {
      name: 'Diana Wu',
      organization: 'Stanford CS',
      role: 'PhD Candidate',
      relationshipStrength: 70,
      lastInteraction: new Date('2026-04-18'),
      notes: 'Close research collaborator',
      capabilities: [
        {
          type: 'willingness',
          description: 'co-author and peer review papers',
          condition: null,
        },
        {
          type: 'capability',
          description: 'share GPU compute resources',
          condition: 'reciprocal collaboration',
        },
      ],
    },
  ]

  for (const s of additionalStakeholders) {
    await prisma.stakeholder.create({ data: s })
  }

  // ─── Prerequisites ────────────────────────────────────────────

  // TA Goal
  const taPrereq1 = await prisma.prerequisite.create({
    data: {
      title: 'Earn A in CS 301',
      description: 'Achieve an A grade in the target course',
      status: 'COMPLETED',
      confidenceScore: 95,
      goalId: taGoal.id,
    },
  })
  await prisma.prerequisite.create({
    data: {
      title: 'Build relationship with Prof. Chen',
      description:
        'Establish a strong working relationship through office hours',
      status: 'IN_PROGRESS',
      confidenceScore: 70,
      goalId: taGoal.id,
    },
  })
  await prisma.prerequisite.create({
    data: {
      title: 'Demonstrate teaching experience',
      description: 'Show evidence of teaching or tutoring ability',
      status: 'NOT_STARTED',
      confidenceScore: 20,
      goalId: taGoal.id,
    },
  })
  await prisma.prerequisite.create({
    data: {
      title: 'Obtain recommendation letter',
      description: 'Get a recommendation from a faculty member',
      status: 'NOT_STARTED',
      confidenceScore: 40,
      goalId: taGoal.id,
    },
  })

  // Startup Goal
  const startupPrereq1 = await prisma.prerequisite.create({
    data: {
      title: 'Complete MVP',
      description: 'Build a working prototype of the AI productivity tool',
      status: 'IN_PROGRESS',
      confidenceScore: 65,
      goalId: startupGoal.id,
    },
  })
  const startupPrereq2 = await prisma.prerequisite.create({
    data: {
      title: 'Pitch deck finalized',
      description: 'Create a compelling investor pitch deck with market data',
      status: 'COMPLETED',
      confidenceScore: 90,
      goalId: startupGoal.id,
    },
  })
  await prisma.prerequisite.create({
    data: {
      title: 'Warm intros to 5+ investors',
      description:
        'Get warm introductions to at least 5 angel/pre-seed investors',
      status: 'IN_PROGRESS',
      confidenceScore: 35,
      goalId: startupGoal.id,
    },
  })

  // Research Goal
  await prisma.prerequisite.create({
    data: {
      title: 'Literature review complete',
      description: 'Complete a comprehensive review of related work',
      status: 'IN_PROGRESS',
      confidenceScore: 55,
      goalId: researchGoal.id,
    },
  })
  await prisma.prerequisite.create({
    data: {
      title: 'Experiment design approved',
      description: 'Get experiment methodology approved by advisor',
      status: 'NOT_STARTED',
      confidenceScore: 25,
      goalId: researchGoal.id,
    },
  })

  // Investment Goal
  await prisma.prerequisite.create({
    data: {
      title: 'Open brokerage account',
      description: 'Research and open an account at Fidelity or Vanguard',
      status: 'COMPLETED',
      confidenceScore: 100,
      goalId: investGoal.id,
    },
  })
  await prisma.prerequisite.create({
    data: {
      title: 'Set up automatic transfers',
      description: 'Configure $500/month auto-invest',
      status: 'IN_PROGRESS',
      confidenceScore: 60,
      goalId: investGoal.id,
    },
  })

  // Marathon Goal
  await prisma.prerequisite.create({
    data: {
      title: 'Build base mileage to 20 mi/week',
      description: 'Gradually increase weekly running volume',
      status: 'IN_PROGRESS',
      confidenceScore: 50,
      goalId: marathonGoal.id,
    },
  })
  await prisma.prerequisite.create({
    data: {
      title: 'Register for race',
      description: 'Sign up for a half marathon event',
      status: 'NOT_STARTED',
      confidenceScore: 30,
      goalId: marathonGoal.id,
    },
  })

  // Rust Goal
  await prisma.prerequisite.create({
    data: {
      title: 'Complete Rustlings exercises',
      description: 'Work through all Rustlings exercises',
      status: 'IN_PROGRESS',
      confidenceScore: 45,
      goalId: rustGoal.id,
    },
  })

  // ─── Evidence ─────────────────────────────────────────────────

  await prisma.evidence.create({
    data: {
      title: 'A grade achieved in CS 301',
      description: 'Final grade posted: A',
      source: 'transcript',
      prerequisiteId: taPrereq1.id,
    },
  })
  await prisma.evidence.create({
    data: {
      title: 'Pitch deck v3 completed',
      description: 'Updated deck with market size and competitive analysis',
      source: 'document',
      prerequisiteId: startupPrereq2.id,
    },
  })
  await prisma.evidence.create({
    data: {
      title: 'Meeting with Sarah Kim at demo day',
      description: 'Positive conversation, exchanged contacts',
      source: 'meeting',
      stakeholderId: sarahKim.id,
    },
  })

  // ─── Actions ──────────────────────────────────────────────────

  await prisma.action.create({
    data: {
      title: 'Volunteer to assist classmates in study group',
      status: 'TODO',
      priority: 'HIGH',
      dueDate: new Date('2026-06-15'),
      goalId: taGoal.id,
    },
  })
  await prisma.action.create({
    data: {
      title: 'Schedule meeting with Prof. Chen',
      status: 'TODO',
      priority: 'HIGH',
      dueDate: new Date('2026-06-01'),
      goalId: taGoal.id,
    },
  })
  await prisma.action.create({
    data: {
      title: 'Ask Prof. Chen for recommendation',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: new Date('2026-07-01'),
      goalId: taGoal.id,
    },
  })
  await prisma.action.create({
    data: {
      title: 'Complete MVP core features',
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      dueDate: new Date('2026-07-15'),
      goalId: startupGoal.id,
    },
  })
  await prisma.action.create({
    data: {
      title: 'Email Sarah Kim for investor intros',
      status: 'TODO',
      priority: 'HIGH',
      dueDate: new Date('2026-06-10'),
      goalId: startupGoal.id,
    },
  })
  await prisma.action.create({
    data: {
      title: 'Schedule literature review session with Dr. Patel',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: new Date('2026-06-20'),
      goalId: researchGoal.id,
    },
  })
  await prisma.action.create({
    data: {
      title: 'Research index fund allocation strategies',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: new Date('2026-06-15'),
      goalId: investGoal.id,
    },
  })
  await prisma.action.create({
    data: {
      title: 'Create meal prep plan for week 1',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: new Date('2026-06-08'),
      goalId: nutritionGoal.id,
    },
  })
  await prisma.action.create({
    data: {
      title: 'Draft first blog post outline',
      status: 'TODO',
      priority: 'LOW',
      dueDate: new Date('2026-06-30'),
      goalId: blogGoal.id,
    },
  })

  // ─── Relationships ────────────────────────────────────────────

  await prisma.relationship.create({
    data: {
      fromType: 'STAKEHOLDER',
      fromId: profChen.id,
      toType: 'GOAL',
      toId: taGoal.id,
      label: 'can recommend for',
      stakeholderFromId: profChen.id,
      goalToId: taGoal.id,
    },
  })
  await prisma.relationship.create({
    data: {
      fromType: 'STAKEHOLDER',
      fromId: sarahKim.id,
      toType: 'GOAL',
      toId: startupGoal.id,
      label: 'potential investor',
      stakeholderFromId: sarahKim.id,
      goalToId: startupGoal.id,
    },
  })
  await prisma.relationship.create({
    data: {
      fromType: 'STAKEHOLDER',
      fromId: drPatel.id,
      toType: 'GOAL',
      toId: researchGoal.id,
      label: 'research advisor',
      stakeholderFromId: drPatel.id,
      goalToId: researchGoal.id,
    },
  })
  await prisma.relationship.create({
    data: {
      fromType: 'GOAL',
      fromId: researchGoal.id,
      toType: 'GOAL',
      toId: taGoal.id,
      label: 'strengthens application',
      goalFromId: researchGoal.id,
      goalToId: taGoal.id,
    },
  })

  // ─── Events ───────────────────────────────────────────────────

  const entities = [
    { type: 'GOAL' as const, id: taGoal.id, title: taGoal.title },
    { type: 'GOAL' as const, id: startupGoal.id, title: startupGoal.title },
    { type: 'GOAL' as const, id: researchGoal.id, title: researchGoal.title },
    { type: 'STAKEHOLDER' as const, id: profChen.id, title: profChen.name },
    { type: 'STAKEHOLDER' as const, id: sarahKim.id, title: sarahKim.name },
    { type: 'STAKEHOLDER' as const, id: drPatel.id, title: drPatel.name },
  ]

  for (const entity of entities) {
    await prisma.event.create({
      data: {
        entityType: entity.type,
        entityId: entity.id,
        eventType: 'CREATED',
        payload: { title: entity.title },
      },
    })
  }

  await prisma.event.create({
    data: {
      entityType: 'PREREQUISITE',
      entityId: taPrereq1.id,
      eventType: 'STATUS_CHANGED',
      payload: { from: 'NOT_STARTED', to: 'COMPLETED', title: taPrereq1.title },
    },
  })
  await prisma.event.create({
    data: {
      entityType: 'PREREQUISITE',
      entityId: startupPrereq1.id,
      eventType: 'STATUS_CHANGED',
      payload: {
        from: 'NOT_STARTED',
        to: 'IN_PROGRESS',
        title: startupPrereq1.title,
      },
    },
  })

  // ─── Schedule Events ──────────────────────────────────────────

  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)

  // TA Goal - study group sessions (Mon/Wed/Fri)
  for (const dayOffset of [1, 3, 5]) {
    const start = new Date(weekStart)
    start.setDate(start.getDate() + dayOffset)
    start.setHours(14, 0, 0, 0)
    const end = new Date(start)
    end.setHours(15, 0, 0, 0)
    await prisma.scheduleEvent.create({
      data: {
        title: 'Study group session',
        description: 'Lead classmate study group for CS 301',
        startTime: start,
        endTime: end,
        source: 'GOALOS',
        goalId: taGoal.id,
        color: '#3b82f6',
      },
    })
  }

  // TA Goal - office hours (Tuesday)
  const taOfficeHours = new Date(weekStart)
  taOfficeHours.setDate(taOfficeHours.getDate() + 2)
  taOfficeHours.setHours(10, 0, 0, 0)
  const taOfficeEnd = new Date(taOfficeHours)
  taOfficeEnd.setHours(11, 0, 0, 0)
  await prisma.scheduleEvent.create({
    data: {
      title: 'Office hours with Prof. Chen',
      description: 'Weekly office hours to strengthen relationship',
      startTime: taOfficeHours,
      endTime: taOfficeEnd,
      source: 'GOALOS',
      goalId: taGoal.id,
      color: '#3b82f6',
    },
  })

  // Startup Goal - MVP work blocks (Mon/Tue/Thu 9-12)
  for (const dayOffset of [1, 2, 4]) {
    const start = new Date(weekStart)
    start.setDate(start.getDate() + dayOffset)
    start.setHours(9, 0, 0, 0)
    const end = new Date(start)
    end.setHours(12, 0, 0, 0)
    await prisma.scheduleEvent.create({
      data: {
        title: 'MVP development sprint',
        description: 'Core feature development for AI productivity tool',
        startTime: start,
        endTime: end,
        source: 'GOALOS',
        goalId: startupGoal.id,
        color: '#10b981',
      },
    })
  }

  // Startup Goal - investor outreach (Wednesday)
  const investorBlock = new Date(weekStart)
  investorBlock.setDate(investorBlock.getDate() + 3)
  investorBlock.setHours(16, 0, 0, 0)
  const investorEnd = new Date(investorBlock)
  investorEnd.setHours(18, 0, 0, 0)
  await prisma.scheduleEvent.create({
    data: {
      title: 'Investor outreach & follow-ups',
      description: 'Email warm intros, update pitch materials',
      startTime: investorBlock,
      endTime: investorEnd,
      source: 'GOALOS',
      goalId: startupGoal.id,
      color: '#10b981',
    },
  })

  // Research Goal - literature review (Tue/Thu 14-16)
  for (const dayOffset of [2, 4]) {
    const start = new Date(weekStart)
    start.setDate(start.getDate() + dayOffset)
    start.setHours(14, 0, 0, 0)
    const end = new Date(start)
    end.setHours(16, 0, 0, 0)
    await prisma.scheduleEvent.create({
      data: {
        title: 'Literature review & note-taking',
        description:
          'Read and annotate papers for graph-based reasoning survey',
        startTime: start,
        endTime: end,
        source: 'GOALOS',
        goalId: researchGoal.id,
        color: '#f59e0b',
      },
    })
  }

  // Research Goal - experiment design (Saturday morning)
  const satResearch = new Date(weekStart)
  satResearch.setDate(satResearch.getDate() + 6)
  satResearch.setHours(10, 0, 0, 0)
  const satResearchEnd = new Date(satResearch)
  satResearchEnd.setHours(13, 0, 0, 0)
  await prisma.scheduleEvent.create({
    data: {
      title: 'Experiment design work',
      description: 'Draft methodology section and plan experiments',
      startTime: satResearch,
      endTime: satResearchEnd,
      source: 'GOALOS',
      goalId: researchGoal.id,
      color: '#f59e0b',
    },
  })

  // Marathon training (Mon/Wed/Sat morning)
  for (const dayOffset of [1, 3, 6]) {
    const start = new Date(weekStart)
    start.setDate(start.getDate() + dayOffset)
    start.setHours(6, 30, 0, 0)
    const end = new Date(start)
    end.setHours(7, 30, 0, 0)
    await prisma.scheduleEvent.create({
      data: {
        title: 'Running training',
        description: 'Half marathon training run',
        startTime: start,
        endTime: end,
        source: 'GOALOS',
        goalId: marathonGoal.id,
        color: '#ef4444',
      },
    })
  }

  // Meal prep (Sunday afternoon)
  const mealPrepStart = new Date(weekStart)
  mealPrepStart.setHours(15, 0, 0, 0)
  const mealPrepEnd = new Date(mealPrepStart)
  mealPrepEnd.setHours(17, 0, 0, 0)
  await prisma.scheduleEvent.create({
    data: {
      title: 'Weekly meal prep',
      description: 'Prepare healthy meals for the week',
      startTime: mealPrepStart,
      endTime: mealPrepEnd,
      source: 'GOALOS',
      goalId: nutritionGoal.id,
      color: '#8b5cf6',
    },
  })

  // ─── Vehicles ───────────────────────────────────────────────────

  // EDUCATION: CS Degree (active, linked to research & TA goals)
  const csDegree = await prisma.vehicle.create({
    data: {
      title: 'CS Degree at MIT',
      description:
        'Computer Science undergraduate degree — provides lab access, faculty network, research opportunities, and academic credentials',
      type: 'EDUCATION',
      status: 'ACTIVE',
      institution: 'MIT',
      startDate: new Date('2024-09-01'),
      investmentNotes: '~$60K/year tuition, 40h/week commitment',
      leverageScore: 5,
      valueId: values[2].id, // Knowledge & Learning
    },
  })

  // EMPLOYMENT: Freelance Consulting (building)
  const consultingVehicle = await prisma.vehicle.create({
    data: {
      title: 'AI/ML Freelance Consulting',
      description:
        'Side consulting practice — generates income, builds industry reputation, creates client network',
      type: 'EMPLOYMENT',
      status: 'BUILDING',
      investmentNotes: '10h/week, initial portfolio setup',
      leverageScore: 3,
      valueId: values[0].id, // Financial Security
    },
  })

  // BUSINESS: Startup (acquiring — fundraising)
  const startupVehicle = await prisma.vehicle.create({
    data: {
      title: 'AI Productivity Startup',
      description:
        'GoalOS — an AI productivity company. Vehicle for wealth creation, reputation building, and attracting talent',
      type: 'BUSINESS',
      status: 'ACQUIRING',
      institution: 'GoalOS Inc',
      startDate: new Date('2026-01-15'),
      investmentNotes: '$500K pre-seed target, 60h/week',
      leverageScore: 6,
      valueId: values[1].id, // Career Growth
    },
  })

  // PLATFORM: Open Source Project (building)
  const ossVehicle = await prisma.vehicle.create({
    data: {
      title: 'Graph-Reasoning OSS Project',
      description:
        'Open source project on graph-based reasoning — builds reputation, attracts contributors, demonstrates technical leadership',
      type: 'PLATFORM',
      status: 'BUILDING',
      investmentNotes: '5h/week maintenance + community management',
      leverageScore: 3,
      valueId: values[5].id, // Impact & Giving Back
    },
  })

  // PLATFORM: Tech Blog (identified, not yet started)
  const blogVehicle = await prisma.vehicle.create({
    data: {
      title: 'Technical Blog on Medium',
      description:
        'Content platform for sharing ML/systems insights — builds thought leadership, attracts speaking invites and consulting leads',
      type: 'PLATFORM',
      status: 'IDENTIFIED',
      institution: 'Medium',
      investmentNotes: '3-4h per post, 2 posts/month target',
      leverageScore: 2,
      valueId: values[5].id, // Impact & Giving Back
    },
  })

  // NETWORK: University Alumni Network (active)
  const alumniNetwork = await prisma.vehicle.create({
    data: {
      title: 'MIT Alumni Network',
      description:
        'Access to alumni connections across tech, finance, and academia — warm intros, mentorship, job referrals',
      type: 'NETWORK',
      status: 'ACTIVE',
      institution: 'MIT',
      startDate: new Date('2024-09-01'),
      investmentNotes: 'Attend 2 events/month, maintain relationships',
      leverageScore: 4,
      valueId: values[1].id, // Career Growth
    },
  })

  // ORGANIZATION: Church community (active)
  const churchVehicle = await prisma.vehicle.create({
    data: {
      title: 'Grace Community Church',
      description:
        'Religious community providing deep social bonds, mentorship from elders, service opportunities, and a grounding support system',
      type: 'ORGANIZATION',
      status: 'ACTIVE',
      institution: 'Grace Community Church',
      startDate: new Date('2023-06-01'),
      investmentNotes: 'Sunday service + Wednesday small group, ~5h/week',
      leverageScore: 3,
      valueId: values[4].id, // Family
    },
  })

  // EVENT_SERIES: Monthly dinner party (building)
  const dinnerParty = await prisma.vehicle.create({
    data: {
      title: 'Monthly Founder Dinner',
      description:
        'Hosted dinner for 8-12 founders and investors each month — creates high-trust connections, deal flow, and cross-pollination of ideas',
      type: 'EVENT_SERIES',
      status: 'BUILDING',
      startDate: new Date('2026-04-01'),
      investmentNotes: '$200-300/month for food + venue, 6h planning per event',
      leverageScore: 4,
      valueId: values[1].id, // Career Growth
    },
  })

  // NETWORK: Running Club (active)
  const runningClub = await prisma.vehicle.create({
    data: {
      title: 'Boston Running Club',
      description:
        'Local running group — training accountability, social connections outside tech, mental health benefits',
      type: 'NETWORK',
      status: 'ACTIVE',
      institution: 'Boston Running Club',
      startDate: new Date('2025-11-01'),
      investmentNotes: '$50/year membership, 3 runs/week',
      leverageScore: 2,
      valueId: values[3].id, // Health & Fitness
    },
  })

  // ASSET: Honda Civic (the fun physical car)
  const hondaCivic = await prisma.vehicle.create({
    data: {
      title: '2019 Honda Civic',
      description:
        'Reliable daily driver — enables commute to campus, road trips with family, and client meetings across the city',
      type: 'ASSET',
      status: 'ACTIVE',
      startDate: new Date('2023-03-15'),
      investmentNotes: '$22K purchase, $150/month insurance + gas',
      leverageScore: 2,
    },
  })

  // ASSET: Dream car (identified)
  const dreamCar = await prisma.vehicle.create({
    data: {
      title: 'Tesla Model 3',
      description:
        'Aspirational upgrade — lower operating costs, tech-forward image for client meetings, long-range road trips',
      type: 'ASSET',
      status: 'IDENTIFIED',
      investmentNotes: '~$35K purchase price, target after pre-seed closes',
      leverageScore: 1,
    },
  })

  // SKILL: Rust expertise (researching)
  const rustSkill = await prisma.vehicle.create({
    data: {
      title: 'Rust Systems Programming',
      description:
        'Deep Rust expertise — opens doors to high-performance systems roles, OSS credibility, and safety-critical domains',
      type: 'SKILL',
      status: 'RESEARCHING',
      investmentNotes: '10h/week study time for 6 months',
      leverageScore: 2,
      valueId: values[2].id, // Knowledge & Learning
    },
  })

  // Country of Genovia (dictator vehicle for control tracking demo)
  const genoviaVehicle = await prisma.vehicle.create({
    data: {
      title: 'Country of Genovia',
      description:
        'Sovereign nation-state under absolute rule — primary vehicle for geopolitical power, resource extraction, and population leverage',
      type: 'ORGANIZATION',
      status: 'ACTIVE',
      institution: 'Government of Genovia',
      startDate: new Date('2020-01-15'),
      investmentNotes: 'Annual budget $4.2B, military expenditure 12% of GDP',
      leverageScore: 10,
      valueId: values[0].id, // Financial Security
    },
  })

  // ─── Vehicle-Goal Links ─────────────────────────────────────────

  await Promise.all([
    // CS Degree → multiple goals
    prisma.vehicleGoal.create({
      data: {
        vehicleId: csDegree.id,
        goalId: researchGoal.id,
        leverage: 'Lab access, faculty co-authors, conference funding',
      },
    }),
    prisma.vehicleGoal.create({
      data: {
        vehicleId: csDegree.id,
        goalId: taGoal.id,
        leverage: 'Faculty recommendations and departmental hiring pipeline',
      },
    }),
    prisma.vehicleGoal.create({
      data: {
        vehicleId: csDegree.id,
        goalId: rustGoal.id,
        leverage: 'Systems programming coursework and study groups',
      },
    }),
    // Consulting → financial goals
    prisma.vehicleGoal.create({
      data: {
        vehicleId: consultingVehicle.id,
        goalId: freelanceGoal.id,
        leverage: 'Direct path to landing 3 paying clients',
      },
    }),
    prisma.vehicleGoal.create({
      data: {
        vehicleId: consultingVehicle.id,
        goalId: investGoal.id,
        leverage: 'Side income funds index fund contributions',
      },
    }),
    // Startup → career + financial goals
    prisma.vehicleGoal.create({
      data: {
        vehicleId: startupVehicle.id,
        goalId: startupGoal.id,
        leverage: 'The startup IS the fundraising vehicle',
      },
    }),
    prisma.vehicleGoal.create({
      data: {
        vehicleId: startupVehicle.id,
        goalId: leadershipGoal.id,
        leverage: 'OSS project serves as startup credibility + talent pipeline',
      },
    }),
    // OSS Project → impact goals
    prisma.vehicleGoal.create({
      data: {
        vehicleId: ossVehicle.id,
        goalId: leadershipGoal.id,
        leverage: 'Direct path to 500 stars',
      },
    }),
    prisma.vehicleGoal.create({
      data: {
        vehicleId: ossVehicle.id,
        goalId: ossGoal.id,
        leverage:
          'Contributing to own project counts + attracts reciprocal contributions',
      },
    }),
    // Blog → impact goals
    prisma.vehicleGoal.create({
      data: {
        vehicleId: blogVehicle.id,
        goalId: blogGoal.id,
        leverage: 'Blog IS the vehicle for the 10-post goal',
      },
    }),
    // Alumni network → startup + career
    prisma.vehicleGoal.create({
      data: {
        vehicleId: alumniNetwork.id,
        goalId: startupGoal.id,
        leverage: 'Warm intros to investors and early hires',
      },
    }),
    prisma.vehicleGoal.create({
      data: {
        vehicleId: alumniNetwork.id,
        goalId: taGoal.id,
        leverage: 'Inside knowledge on TA selection process',
      },
    }),
    // Church → family + social goals
    prisma.vehicleGoal.create({
      data: {
        vehicleId: churchVehicle.id,
        goalId: dadGoal.id,
        leverage: 'Shared spiritual practice strengthens family bonds',
      },
    }),
    prisma.vehicleGoal.create({
      data: {
        vehicleId: churchVehicle.id,
        goalId: socialGoal.id,
        leverage: 'Small groups and service teams expand social circle',
      },
    }),
    prisma.vehicleGoal.create({
      data: {
        vehicleId: churchVehicle.id,
        goalId: boundariesGoal.id,
        leverage: 'Counseling and mentorship from church elders',
      },
    }),
    // Dinner party → startup + social
    prisma.vehicleGoal.create({
      data: {
        vehicleId: dinnerParty.id,
        goalId: startupGoal.id,
        leverage: 'Direct access to investors in relaxed setting',
      },
    }),
    prisma.vehicleGoal.create({
      data: {
        vehicleId: dinnerParty.id,
        goalId: dateGoal.id,
        leverage: 'Meet interesting people through curated guest lists',
      },
    }),
    // Running club → health goals
    prisma.vehicleGoal.create({
      data: {
        vehicleId: runningClub.id,
        goalId: marathonGoal.id,
        leverage: 'Training partners and structured group runs',
      },
    }),
    prisma.vehicleGoal.create({
      data: {
        vehicleId: runningClub.id,
        goalId: sleepGoal.id,
        leverage: 'Morning runs enforce consistent sleep schedule',
      },
    }),
    // Honda Civic → road trip + commuting
    prisma.vehicleGoal.create({
      data: {
        vehicleId: hondaCivic.id,
        goalId: siblingGoal.id,
        leverage: 'Transportation for the West Coast road trip',
      },
    }),
    // Rust skill → multiple goals
    prisma.vehicleGoal.create({
      data: {
        vehicleId: rustSkill.id,
        goalId: rustGoal.id,
        leverage: 'Direct skill acquisition path',
      },
    }),
    prisma.vehicleGoal.create({
      data: {
        vehicleId: rustSkill.id,
        goalId: leadershipGoal.id,
        leverage: 'Rust OSS contributions build systems credibility',
      },
    }),
  ])

  // ─── Opportunities (unlocked by vehicles) ───────────────────────

  await Promise.all([
    prisma.opportunity.create({
      data: {
        title: 'Intro to Prof. Chen via office hours',
        description:
          'CS Degree gave direct access to Prof. Chen who can provide TA recommendation',
        vehicleId: csDegree.id,
        goalId: taGoal.id,
        realized: true,
        realizedAt: new Date('2026-04-20'),
      },
    }),
    prisma.opportunity.create({
      data: {
        title: 'Research lab access for graph reasoning paper',
        description:
          'Department membership includes access to GPU cluster and research datasets',
        vehicleId: csDegree.id,
        goalId: researchGoal.id,
        realized: true,
        realizedAt: new Date('2026-01-15'),
      },
    }),
    prisma.opportunity.create({
      data: {
        title: 'Conference travel grant from department',
        description: 'Up to $2K travel funding for NeurIPS if paper accepted',
        vehicleId: csDegree.id,
        goalId: researchGoal.id,
        realized: false,
      },
    }),
    prisma.opportunity.create({
      data: {
        title: 'Warm intro to Sarah Kim via alumni meetup',
        description:
          'Alumni event led to conversation with Sequoia partner about AI tools',
        vehicleId: alumniNetwork.id,
        goalId: startupGoal.id,
        realized: true,
        realizedAt: new Date('2026-02-15'),
      },
    }),
    prisma.opportunity.create({
      data: {
        title: 'Investor pitch at founder dinner #2',
        description:
          'Seated next to angel investor at second dinner, pitched GoalOS concept',
        vehicleId: dinnerParty.id,
        goalId: startupGoal.id,
        realized: false,
      },
    }),
    prisma.opportunity.create({
      data: {
        title: 'Marriage counselor recommendation from Pastor Dave',
        description:
          'Church elder recommended a counselor for relationship skills development',
        vehicleId: churchVehicle.id,
        goalId: boundariesGoal.id,
        realized: true,
        realizedAt: new Date('2026-03-01'),
      },
    }),
    prisma.opportunity.create({
      data: {
        title: 'Training partner for half marathon',
        description:
          'Met experienced runner at club who offered to be pace partner for race day',
        vehicleId: runningClub.id,
        goalId: marathonGoal.id,
        realized: true,
        realizedAt: new Date('2026-05-10'),
      },
    }),
  ])

  // ─── Control Dimensions (extent of control for vehicles) ────────

  await Promise.all([
    // Genovia — full dictator control panel
    prisma.controlDimension.create({
      data: {
        vehicleId: genoviaVehicle.id,
        name: 'Financial Access',
        description:
          'Control over national treasury, central bank, and tax revenue',
        value: 92,
        icon: '💰',
        color: '#10b981',
      },
    }),
    prisma.controlDimension.create({
      data: {
        vehicleId: genoviaVehicle.id,
        name: 'Army Control',
        description: 'Loyalty and operational command of armed forces',
        value: 85,
        icon: '⚔️',
        color: '#ef4444',
      },
    }),
    prisma.controlDimension.create({
      data: {
        vehicleId: genoviaVehicle.id,
        name: 'Population Sentiment',
        description: 'Public approval rating and civil obedience',
        value: 58,
        icon: '👥',
        color: '#f59e0b',
      },
    }),
    prisma.controlDimension.create({
      data: {
        vehicleId: genoviaVehicle.id,
        name: 'Media Control',
        description:
          'Influence over state media, censorship apparatus, and narrative',
        value: 95,
        icon: '📺',
        color: '#8b5cf6',
      },
    }),
    prisma.controlDimension.create({
      data: {
        vehicleId: genoviaVehicle.id,
        name: 'Intelligence Network',
        description: 'Reach and reliability of domestic intelligence agencies',
        value: 78,
        icon: '🕵️',
        color: '#6366f1',
      },
    }),
    prisma.controlDimension.create({
      data: {
        vehicleId: genoviaVehicle.id,
        name: 'Judicial Control',
        description: 'Ability to influence courts and legal outcomes',
        value: 88,
        icon: '⚖️',
        color: '#14b8a6',
      },
    }),
    // CS Degree — academic control dimensions
    prisma.controlDimension.create({
      data: {
        vehicleId: csDegree.id,
        name: 'Academic Standing',
        description: 'GPA, course completion, professor relationships',
        value: 72,
        icon: '📚',
        color: '#3b82f6',
      },
    }),
    prisma.controlDimension.create({
      data: {
        vehicleId: csDegree.id,
        name: 'Research Access',
        description: 'Lab access, GPU cluster, dataset availability',
        value: 65,
        icon: '🔬',
        color: '#8b5cf6',
      },
    }),
    // Consulting — client control
    prisma.controlDimension.create({
      data: {
        vehicleId: consultingVehicle.id,
        name: 'Client Pipeline',
        description: 'Active leads and repeat client relationships',
        value: 55,
        icon: '📋',
        color: '#f59e0b',
      },
    }),
    prisma.controlDimension.create({
      data: {
        vehicleId: consultingVehicle.id,
        name: 'Revenue Predictability',
        description: 'Monthly recurring vs one-off contracts',
        value: 40,
        icon: '📊',
        color: '#10b981',
      },
    }),
    // Startup — founder control
    prisma.controlDimension.create({
      data: {
        vehicleId: startupVehicle.id,
        name: 'Technical Velocity',
        description: 'Speed of shipping features and iterating on product',
        value: 80,
        icon: '🚀',
        color: '#3b82f6',
      },
    }),
    prisma.controlDimension.create({
      data: {
        vehicleId: startupVehicle.id,
        name: 'Runway',
        description: 'Months of cash remaining before needing funding',
        value: 35,
        icon: '⏳',
        color: '#ef4444',
      },
    }),
    prisma.controlDimension.create({
      data: {
        vehicleId: startupVehicle.id,
        name: 'User Traction',
        description: 'Active users, engagement metrics, growth rate',
        value: 22,
        icon: '📈',
        color: '#10b981',
      },
    }),
  ])

  // ─── Value connections (many-to-many) ───────────────────────────
  // Every entity is connected to one or more values that it relates to.
  // values[0] = Financial Security, values[1] = Career Growth,
  // values[2] = Knowledge & Learning, values[3] = Health & Fitness,
  // values[4] = Family, values[5] = Impact & Giving Back,
  // values[6] = Romantic Relationships

  const v = {
    financial: values[0].id,
    career: values[1].id,
    knowledge: values[2].id,
    health: values[3].id,
    family: values[4].id,
    impact: values[5].id,
    romantic: values[6].id,
  }

  // --- Goals: connect to all relevant values (beyond just primary) ---
  const goalValueMap: Record<string, string[]> = {
    [investGoal.id]: [v.financial],
    [freelanceGoal.id]: [v.financial, v.career],
    [budgetGoal.id]: [v.financial],
    [taGoal.id]: [v.career, v.knowledge],
    [startupGoal.id]: [v.career, v.financial],
    [leadershipGoal.id]: [v.career, v.impact, v.knowledge],
    [researchGoal.id]: [v.knowledge, v.career],
    [rustGoal.id]: [v.knowledge, v.career],
    [philosophyGoal.id]: [v.knowledge],
    [marathonGoal.id]: [v.health],
    [nutritionGoal.id]: [v.health],
    [sleepGoal.id]: [v.health],
    [dadGoal.id]: [v.family],
    [siblingGoal.id]: [v.family],
    [familyFinanceGoal.id]: [v.family, v.financial],
    [ossGoal.id]: [v.impact, v.knowledge],
    [workshopGoal.id]: [v.impact, v.knowledge],
    [blogGoal.id]: [v.impact, v.career],
    [socialGoal.id]: [v.romantic, v.family],
    [boundariesGoal.id]: [v.romantic, v.health],
    [dateGoal.id]: [v.romantic],
  }

  for (const [goalId, valueIds] of Object.entries(goalValueMap)) {
    await prisma.goal.update({
      where: { id: goalId },
      data: { values: { connect: valueIds.map((id) => ({ id })) } },
    })
  }

  // --- Stakeholders ---
  // Prof. Chen → Career Growth, Knowledge & Learning
  await prisma.stakeholder.update({
    where: { id: profChen.id },
    data: {
      values: { connect: [{ id: v.career }, { id: v.knowledge }] },
    },
  })
  // Sarah Kim → Financial Security, Career Growth
  await prisma.stakeholder.update({
    where: { id: sarahKim.id },
    data: {
      values: { connect: [{ id: v.financial }, { id: v.career }] },
    },
  })
  // Dr. Patel → Knowledge & Learning, Career Growth
  await prisma.stakeholder.update({
    where: { id: drPatel.id },
    data: {
      values: { connect: [{ id: v.knowledge }, { id: v.career }] },
    },
  })
  // Dad → Family, Financial Security
  await prisma.stakeholder.update({
    where: { id: dad.id },
    data: {
      values: { connect: [{ id: v.family }, { id: v.financial }] },
    },
  })
  // Mom → Family, Health & Fitness
  await prisma.stakeholder.update({
    where: { id: mom.id },
    data: {
      values: { connect: [{ id: v.family }, { id: v.health }] },
    },
  })

  // Additional stakeholders — connect by querying them
  const allStakeholders = await prisma.stakeholder.findMany()
  const stakeholderValueMap: Record<string, string[]> = {
    'Lisa Wang': [v.financial, v.career],
    'James Rodriguez': [v.knowledge, v.career],
    'Emily Zhang': [v.knowledge, v.career],
    'Michael Torres': [v.knowledge],
    'Anna Kowalski': [v.career, v.financial],
    'Diana Wu': [v.knowledge, v.career],
  }
  for (const s of allStakeholders) {
    const vals = stakeholderValueMap[s.name]
    if (vals) {
      await prisma.stakeholder.update({
        where: { id: s.id },
        data: { values: { connect: vals.map((id) => ({ id })) } },
      })
    }
  }

  // --- Prerequisites: inherit goal's values ---
  const allPrereqs = await prisma.prerequisite.findMany({
    include: { goal: true },
  })
  for (const p of allPrereqs) {
    const vals = goalValueMap[p.goalId]
    if (vals) {
      await prisma.prerequisite.update({
        where: { id: p.id },
        data: { values: { connect: vals.map((id) => ({ id })) } },
      })
    }
  }

  // --- Evidence: inherit from parent prerequisite/stakeholder values ---
  const allEvidence = await prisma.evidence.findMany()
  for (const e of allEvidence) {
    const connectedValues: string[] = []
    if (e.prerequisiteId) {
      const prereq = allPrereqs.find((p) => p.id === e.prerequisiteId)
      if (prereq) {
        const vals = goalValueMap[prereq.goalId]
        if (vals) connectedValues.push(...vals)
      }
    }
    if (e.stakeholderId) {
      const s = allStakeholders.find((s) => s.id === e.stakeholderId)
      if (s) {
        const vals = stakeholderValueMap[s.name]
        if (vals) connectedValues.push(...vals)
      }
    }
    if (connectedValues.length > 0) {
      const unique = [...new Set(connectedValues)]
      await prisma.evidence.update({
        where: { id: e.id },
        data: { values: { connect: unique.map((id) => ({ id })) } },
      })
    }
  }

  // --- Actions: inherit goal's values ---
  const allActions = await prisma.action.findMany()
  for (const a of allActions) {
    const vals = goalValueMap[a.goalId]
    if (vals) {
      await prisma.action.update({
        where: { id: a.id },
        data: { values: { connect: vals.map((id) => ({ id })) } },
      })
    }
  }

  // --- Schedule Events: inherit goal's values ---
  const allScheduleEvents = await prisma.scheduleEvent.findMany()
  for (const se of allScheduleEvents) {
    if (se.goalId) {
      const vals = goalValueMap[se.goalId]
      if (vals) {
        await prisma.scheduleEvent.update({
          where: { id: se.id },
          data: { values: { connect: vals.map((id) => ({ id })) } },
        })
      }
    }
  }

  // --- Vehicles: connect to relevant values (many-to-many) ---
  const vehicleValueMap: Record<string, string[]> = {
    [csDegree.id]: [v.knowledge, v.career],
    [consultingVehicle.id]: [v.financial, v.career],
    [startupVehicle.id]: [v.career, v.financial, v.impact],
    [ossVehicle.id]: [v.impact, v.career, v.knowledge],
    [blogVehicle.id]: [v.impact, v.career],
    [alumniNetwork.id]: [v.career, v.financial],
    [churchVehicle.id]: [v.family, v.romantic, v.impact],
    [dinnerParty.id]: [v.career, v.romantic, v.financial],
    [runningClub.id]: [v.health],
    [hondaCivic.id]: [v.family, v.career],
    [dreamCar.id]: [v.career, v.financial],
    [rustSkill.id]: [v.knowledge, v.career],
    [genoviaVehicle.id]: [v.financial, v.career, v.impact],
  }

  for (const [vehicleId, valueIds] of Object.entries(vehicleValueMap)) {
    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { values: { connect: valueIds.map((id) => ({ id })) } },
    })
  }

  // --- Opportunities: inherit vehicle's values ---
  const allOpportunities = await prisma.opportunity.findMany()
  for (const opp of allOpportunities) {
    const vals = vehicleValueMap[opp.vehicleId]
    if (vals) {
      await prisma.opportunity.update({
        where: { id: opp.id },
        data: { values: { connect: vals.map((id) => ({ id })) } },
      })
    }
  }

  // ─── Resource Types (default + examples) ────────────────────────

  const financialType = await prisma.resourceType.create({
    data: {
      name: 'Financial',
      unit: 'USD',
      icon: '💰',
      color: '#22c55e',
      description: 'Cash flow — income, expenses, investments',
      isDefault: true,
    },
  })

  const emotionalType = await prisma.resourceType.create({
    data: {
      name: 'Emotional Energy',
      unit: 'points',
      icon: '❤️',
      color: '#ef4444',
      description: 'Emotional bandwidth — stress, fulfillment, motivation',
      isDefault: true,
    },
  })

  const socialType = await prisma.resourceType.create({
    data: {
      name: 'Social Capital',
      unit: 'connections',
      icon: '🤝',
      color: '#8b5cf6',
      description: 'Network value — introductions, reputation, trust',
      isDefault: true,
    },
  })

  const timeType = await prisma.resourceType.create({
    data: {
      name: 'Time',
      unit: 'hours',
      icon: '⏱️',
      color: '#f59e0b',
      description: 'Hours invested or saved',
      isDefault: true,
    },
  })

  const knowledgeType = await prisma.resourceType.create({
    data: {
      name: 'Knowledge',
      unit: 'skills',
      icon: '🧠',
      color: '#3b82f6',
      description: 'Intellectual capital — skills learned, expertise gained',
      isDefault: true,
    },
  })

  // ─── Resource Flows (attached to vehicles, stakeholders, goals) ─

  // Consulting Vehicle — main cash flow generator
  await prisma.resourceFlow.createMany({
    data: [
      {
        resourceTypeId: financialType.id,
        entityType: 'VEHICLE',
        entityId: consultingVehicle.id,
        direction: 'INFLOW',
        amount: 8000,
        frequency: 'MONTHLY',
        label: 'Consulting revenue',
        notes: 'Average monthly billing from 2 active clients',
      },
      {
        resourceTypeId: financialType.id,
        entityType: 'VEHICLE',
        entityId: consultingVehicle.id,
        direction: 'OUTFLOW',
        amount: 200,
        frequency: 'MONTHLY',
        label: 'Software subscriptions',
        notes: 'Figma, AWS, GitHub Teams',
      },
      {
        resourceTypeId: timeType.id,
        entityType: 'VEHICLE',
        entityId: consultingVehicle.id,
        direction: 'OUTFLOW',
        amount: 20,
        frequency: 'WEEKLY',
        label: 'Client work hours',
      },
      {
        resourceTypeId: socialType.id,
        entityType: 'VEHICLE',
        entityId: consultingVehicle.id,
        direction: 'INFLOW',
        amount: 2,
        frequency: 'MONTHLY',
        label: 'Client referrals and introductions',
      },
    ],
  })

  // Startup Vehicle — cash burn but high knowledge/social gains
  await prisma.resourceFlow.createMany({
    data: [
      {
        resourceTypeId: financialType.id,
        entityType: 'VEHICLE',
        entityId: startupVehicle.id,
        direction: 'OUTFLOW',
        amount: 3000,
        frequency: 'MONTHLY',
        label: 'Startup operating costs',
        notes: 'Servers, tools, marketing spend',
      },
      {
        resourceTypeId: knowledgeType.id,
        entityType: 'VEHICLE',
        entityId: startupVehicle.id,
        direction: 'INFLOW',
        amount: 3,
        frequency: 'MONTHLY',
        label: 'Technical skills from building product',
      },
      {
        resourceTypeId: socialType.id,
        entityType: 'VEHICLE',
        entityId: startupVehicle.id,
        direction: 'INFLOW',
        amount: 5,
        frequency: 'MONTHLY',
        label: 'Founder network connections',
      },
    ],
  })

  // Open Source Vehicle
  await prisma.resourceFlow.createMany({
    data: [
      {
        resourceTypeId: socialType.id,
        entityType: 'VEHICLE',
        entityId: ossVehicle.id,
        direction: 'INFLOW',
        amount: 3,
        frequency: 'MONTHLY',
        label: 'GitHub stars and community recognition',
      },
      {
        resourceTypeId: timeType.id,
        entityType: 'VEHICLE',
        entityId: ossVehicle.id,
        direction: 'OUTFLOW',
        amount: 5,
        frequency: 'WEEKLY',
        label: 'OSS maintenance hours',
      },
    ],
  })

  // Blog Vehicle
  await prisma.resourceFlow.createMany({
    data: [
      {
        resourceTypeId: socialType.id,
        entityType: 'VEHICLE',
        entityId: blogVehicle.id,
        direction: 'INFLOW',
        amount: 2,
        frequency: 'MONTHLY',
        label: 'Newsletter subscribers and thought leadership',
      },
      {
        resourceTypeId: financialType.id,
        entityType: 'VEHICLE',
        entityId: blogVehicle.id,
        direction: 'INFLOW',
        amount: 500,
        frequency: 'MONTHLY',
        label: 'Sponsorship and affiliate revenue',
      },
      {
        resourceTypeId: timeType.id,
        entityType: 'VEHICLE',
        entityId: blogVehicle.id,
        direction: 'OUTFLOW',
        amount: 4,
        frequency: 'WEEKLY',
        label: 'Content creation time',
      },
    ],
  })

  // Church Vehicle — social and emotional gains
  await prisma.resourceFlow.createMany({
    data: [
      {
        resourceTypeId: emotionalType.id,
        entityType: 'VEHICLE',
        entityId: churchVehicle.id,
        direction: 'INFLOW',
        amount: 15,
        frequency: 'WEEKLY',
        label: 'Community support and spiritual renewal',
      },
      {
        resourceTypeId: socialType.id,
        entityType: 'VEHICLE',
        entityId: churchVehicle.id,
        direction: 'INFLOW',
        amount: 3,
        frequency: 'MONTHLY',
        label: 'New community connections',
      },
      {
        resourceTypeId: financialType.id,
        entityType: 'VEHICLE',
        entityId: churchVehicle.id,
        direction: 'OUTFLOW',
        amount: 200,
        frequency: 'MONTHLY',
        label: 'Tithes and donations',
      },
    ],
  })

  // Dad stakeholder — financial inflow
  await prisma.resourceFlow.createMany({
    data: [
      {
        resourceTypeId: financialType.id,
        entityType: 'STAKEHOLDER',
        entityId: dad.id,
        direction: 'INFLOW',
        amount: 2000,
        frequency: 'MONTHLY',
        label: 'Tuition support from Dad',
      },
      {
        resourceTypeId: emotionalType.id,
        entityType: 'STAKEHOLDER',
        entityId: dad.id,
        direction: 'INFLOW',
        amount: 5,
        frequency: 'WEEKLY',
        label: 'Parental encouragement',
      },
      {
        resourceTypeId: emotionalType.id,
        entityType: 'STAKEHOLDER',
        entityId: dad.id,
        direction: 'OUTFLOW',
        amount: 3,
        frequency: 'MONTHLY',
        label: 'Pressure to maintain GPA',
      },
    ],
  })

  // Mom stakeholder
  await prisma.resourceFlow.createMany({
    data: [
      {
        resourceTypeId: emotionalType.id,
        entityType: 'STAKEHOLDER',
        entityId: mom.id,
        direction: 'INFLOW',
        amount: 10,
        frequency: 'WEEKLY',
        label: 'Unconditional emotional support',
      },
      {
        resourceTypeId: socialType.id,
        entityType: 'STAKEHOLDER',
        entityId: mom.id,
        direction: 'INFLOW',
        amount: 1,
        frequency: 'QUARTERLY',
        label: 'Healthcare industry introductions',
      },
    ],
  })

  // Sarah Kim stakeholder — potential inflow, current outflow
  await prisma.resourceFlow.createMany({
    data: [
      {
        resourceTypeId: timeType.id,
        entityType: 'STAKEHOLDER',
        entityId: sarahKim.id,
        direction: 'OUTFLOW',
        amount: 2,
        frequency: 'MONTHLY',
        label: 'Investor update emails and meetings',
      },
      {
        resourceTypeId: socialType.id,
        entityType: 'STAKEHOLDER',
        entityId: sarahKim.id,
        direction: 'INFLOW',
        amount: 1,
        frequency: 'QUARTERLY',
        label: 'VC network introductions',
      },
    ],
  })

  const flowCount = await prisma.resourceFlow.count()
  const typeCount = await prisma.resourceType.count()

  console.log('Seed data created successfully')
  console.log('  - 7 values')
  console.log('  - 10 completed goals')
  console.log('  - 21 active goals (3 per value)')
  console.log('  - 13 vehicles')
  console.log('  - 22 vehicle-goal links')
  console.log('  - 7 opportunities')
  console.log(`  - ${typeCount} resource types`)
  console.log(`  - ${flowCount} resource flows`)
  console.log('  - 13 control dimensions across 5 vehicles')
  console.log('  - All entities connected to logical values (many-to-many)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
