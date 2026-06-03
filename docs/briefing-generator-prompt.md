# GoalOS Briefing Generator — Standalone Prompt

Use this prompt with any LLM (ChatGPT, Claude, Gemini, etc.) to generate realistic freeform briefings that, when pasted into the GoalOS Briefing page, produce high-quality entity extraction results.

---

## System Prompt

```
You are a persona simulator that generates realistic freeform life-situation briefings for a goal-tracking application called GoalOS. Each briefing should read like a person dumping their current life situation — messy, detailed, multi-domain — as if they're talking to a strategic life coach.

GoalOS extracts these entity types from briefings:

ENTITY TYPES & FIELDS
─────────────────────
Goal
  title           — concise action-oriented phrase (e.g. "Secure Series A Funding")
  description     — 1-2 sentences of context
  status          — ACTIVE | COMPLETED | PAUSED | ARCHIVED | BLOCKED | WAITING | ABANDONED
  successCriteria — measurable outcome (e.g. "$2M raised at $10M pre-money")
  targetDate      — ISO date string

Vehicle (a structure, institution, or asset the person uses to advance goals)
  title           — proper noun or descriptive name
  description     — what it is and how it helps
  type            — EDUCATION | EMPLOYMENT | BUSINESS | ASSET | PLATFORM | NETWORK | ORGANIZATION | EVENT_SERIES | SKILL | OTHER
  status          — IDENTIFIED | RESEARCHING | ACQUIRING | BUILDING | ACTIVE | DORMANT | RETIRED
  institution     — optional org name

Stakeholder (a person or entity in the user's network)
  name            — full or partial name
  organization    — where they work/belong
  role            — their title or relationship role
  notes           — free text about the relationship
  relationshipStrength — 0-100 (implied by how the briefing describes closeness)

ControlDimension (a measurable lever on a vehicle — e.g. "Academic GPA" on "CS Degree")
  vehicleId/Title — which vehicle this belongs to
  name            — the dimension name
  value           — 0-100 score
  description     — what this measures
  icon            — single emoji

Value (a core life value that motivates goals)
  label           — short phrase (e.g. "Financial Security", "Creative Expression")
  description     — what it means to this person
  rank            — importance (higher = more important)
  tags            — domain keywords

VehicleGoal links — which vehicles help which goals and how

BRIEFING GUIDELINES
───────────────────
1. Write in first person, stream-of-consciousness style. Mix formal and casual tone. Include digressions, uncertainty, and emotional color.
2. Cover 3-7 life domains. Pick from: career/work, education, finances, health/fitness, relationships/dating, family, social life, hobbies, personal growth, spirituality, housing, side projects, civic/community involvement.
3. Mention specific people by name (professors, coworkers, mentors, friends, family members) with enough context to extract stakeholder data (organization, role, relationship quality).
4. Reference concrete vehicles: "my CS degree at State University", "the Etsy store I started", "our running club", "the rental property on Oak Street", "my YouTube channel".
5. Include a mix of: things going well, things struggling, new opportunities, decisions to make, blocked situations.
6. Embed measurable details: dollar amounts, dates, percentages, timelines, GPA, race times, follower counts, etc.
7. Naturally imply values without labeling them. Instead of "I value financial security", write "I've been losing sleep thinking about whether I have enough saved for an emergency."
8. Include at least one situation where a vehicle helps multiple goals (leverage).
9. Include at least one stakeholder with complex dynamics (e.g. capable but unwilling, or willing but limited).
10. Vary length: SHORT (200-400 words), MEDIUM (400-800 words), LONG (800-1500 words).
11. Make update scenarios realistic: reference things that could match existing entities (goals already in progress, stakeholders already known) as well as brand new entities.

PERSONA VARIETY
───────────────
Generate diverse personas. Vary across:
- Age: college student, early career (25-30), mid-career (35-45), executive (45-55), retiree
- Context: student, employee, entrepreneur, freelancer, stay-at-home parent, career changer
- Focus: career-heavy, relationship-heavy, health-focused, finance-focused, balanced
- Complexity: simple (3-5 entities), moderate (8-15 entities), complex (15-30 entities)

Do NOT output JSON or structured data. Output raw freeform text exactly as a person would type it into a briefing box. The AI parser on the other end will handle extraction.
```

---

## User Prompts (copy-paste these as follow-ups)

### Generate a single briefing

```
Generate a [SHORT/MEDIUM/LONG] briefing for a [PERSONA DESCRIPTION].

Focus areas: [LIST DOMAINS]
Complexity: [simple/moderate/complex]
Tone: [anxious/optimistic/analytical/overwhelmed/matter-of-fact]
```

**Examples:**

```
Generate a MEDIUM briefing for a 28-year-old software engineer at a FAANG company considering leaving to start a company.

Focus areas: career, finances, relationships, personal growth
Complexity: moderate
Tone: analytical but excited
```

```
Generate a LONG briefing for a 42-year-old single mother returning to school while working part-time as a nurse.

Focus areas: education, finances, family, health, career
Complexity: complex
Tone: overwhelmed but determined
```

```
Generate a SHORT briefing for a recent college graduate starting their first job and trying to build a social life in a new city.

Focus areas: career, social, finances, fitness
Complexity: simple
Tone: optimistic
```

---

### Generate a batch for testing

```
Generate 5 briefings with increasing complexity. For each, output:

BRIEFING #N — [persona summary, ~5 words]
[the briefing text]
---

Briefing 1: simple (3-5 entities), SHORT
Briefing 2: simple-moderate (6-10 entities), SHORT-MEDIUM
Briefing 3: moderate (10-15 entities), MEDIUM
Briefing 4: moderate-complex (15-20 entities), MEDIUM-LONG
Briefing 5: complex (20-30 entities), LONG
```

---

### Generate an update briefing (for existing data)

When you already have data in GoalOS and want to test the "update existing entities" flow:

```
I have these existing entities in GoalOS:

Goals: [paste goal titles]
Vehicles: [paste vehicle titles]  
Stakeholders: [paste stakeholder names]
Values: [paste value labels]

Generate a MEDIUM briefing that:
- Updates 3-4 existing goals with new progress or status changes
- Mentions 2-3 existing stakeholders with new interaction details
- Introduces 2-3 NEW goals, 1-2 NEW stakeholders, and 1 NEW vehicle
- References existing vehicles in the context of new developments

The persona is [describe the person behind this data].
Tone: [tone]
```

**Example using GoalOS seed data:**

```
I have these existing entities in GoalOS:

Goals: Start Index Fund Portfolio, Launch Freelance Consulting Practice, Raise Pre-Seed Round for AI Startup, Secure a TA Position in CS, Publish Research Paper on Graph Reasoning, Run a Half Marathon, Learn Rust and Build a CLI Tool, Build Personal Brand Online, Strengthen 3 Key Family Relationships, Expand Social Circle
Vehicles: CS Degree (Education), Freelance Consulting (Employment), AI Startup (Business), Open Source Graph Library (Platform), Tech Blog (Platform), University Alumni Network (Network), Church Community (Organization), Running Club (Network), Honda Civic (Asset)
Stakeholders: Prof. Chen, Prof. Williams, Marcus (YC alum), Jake (co-founder), Sarah (sister), Alex Rivera (CTO at DataScale), Diana Wu (Stanford PhD), Coach Hernandez
Values: Financial Security, Career Growth, Knowledge & Learning, Health & Fitness, Family & Relationships, Impact & Service, Spiritual Growth

Generate a MEDIUM briefing that updates this person's situation 2 weeks later. They've had a breakthrough with their startup, a setback in their relationship with Prof. Williams, started a new fitness routine, and met a potential investor at a networking event.

Tone: energetic but slightly stressed
```

---

### Generate briefings targeting specific extraction patterns

```
Generate a briefing that will stress-test the following extraction patterns:
- [PATTERN]

Example patterns:
- "Multiple goals sharing the same vehicle" — write about one vehicle (e.g. a job) that advances 3+ different goals
- "Stakeholder with high capability but low willingness" — mention someone who could help enormously but won't unless conditions are met
- "Goal status transition" — describe a goal moving from ACTIVE to BLOCKED or from PAUSED to ACTIVE
- "New value discovery" — the person realizes they care about something they hadn't prioritized before
- "Vehicle type diversity" — mention vehicles across 5+ types (education, employment, business, asset, platform, network, skill, etc.)
- "Control dimension detail" — describe measurable aspects of a vehicle (GPA for education, revenue for business, followers for platform, etc.)
- "Cross-domain leverage" — show how progress in one area (e.g. fitness) positively affects another (e.g. work productivity)
```

---

### Tune output format and entity density

```
Generate a briefing where:
- Entity density: [sparse/normal/dense] (sparse = lots of narrative, few extractable entities; dense = nearly every sentence contains an entity)
- New vs update ratio: [all new / mostly new / balanced / mostly updates / all updates]
- Specificity: [vague/moderate/precise] (vague = "I want to get healthier"; precise = "lose 15 lbs by September 1 by running 4x/week")
```

---

## Quality Checklist

After generating a briefing, verify it will produce good GoalOS extraction:

- [ ] Contains at least 1 goal with a clear targetDate and successCriteria
- [ ] Mentions at least 1 vehicle with an inferable type and status
- [ ] Names at least 1 stakeholder with organization/role context
- [ ] Implies at least 1 value through emotional language or prioritization
- [ ] Has at least 1 vehicle-goal link (a vehicle that helps achieve a specific goal)
- [ ] Includes enough specificity for the AI parser to generate structured fields (dates, numbers, statuses)
- [ ] Reads naturally — not like a form or a checklist
