# GoalOS Briefing — Prompt & Architecture Tuning Guide

This document explains every lever you have for controlling what objects the briefing parser produces, organized from easiest (no code changes) to deepest (architecture changes).

---

## 1. The Pipeline at a Glance

```
User types freeform text
       │
       ▼
POST /api/briefing/parse
       │
       ├── Fetches existing entities from DB (goals, vehicles, stakeholders, values)
       ├── Builds a system prompt with entity schemas + existing entities as context
       ├── Sends to Gemini (model depends on tier: flash or pro)
       ├── Config: temperature=0.3, maxOutputTokens=8000, thinkingBudget=0
       │
       ▼
Returns JSON: { summary, operations[], links[] }
       │
       ▼
User reviews in UI (approve/reject/edit each operation)
       │
       ▼
POST /api/briefing/apply
       │
       ├── Loops through approved operations
       ├── Creates/updates entities in DB with userId
       ├── Processes vehicleGoal links
       │
       ▼
Returns results: [{ entity, action, id, title }]
```

---

## 2. Prompt-Level Tuning (no code changes needed)

These changes go in the `systemPrompt` string in `apps/web/src/app/api/briefing/parse/route.ts` (line 63-109).

### 2a. Control Entity Density (more vs. fewer objects)

**Current behavior:** Rule 3 says "Extract ALL actionable entities." This makes the model aggressive.

**To get fewer, higher-quality objects:**
```diff
- 3. Extract ALL actionable entities — goals, vehicles, stakeholders, control dimensions, values.
- 4. Be thorough but precise. Only include entities clearly implied by the briefing.
+ 3. Extract only entities that are EXPLICITLY stated or strongly implied. Do not infer entities
+    from vague language. A goal must have a clear desired outcome; a stakeholder must be named;
+    a vehicle must be a specific structure the user is engaged with.
+ 4. Prefer fewer, high-confidence operations over many speculative ones.
+    If uncertain whether something is a new entity or an update, skip it.
```

**To get more objects (extract everything possible):**
```diff
- 4. Be thorough but precise. Only include entities clearly implied by the briefing.
+ 4. Be maximally thorough. Extract entities even from weak signals:
+    - Implied goals (e.g. "I really need to..." → create goal)
+    - Mentioned people (e.g. "my friend Alex" → create stakeholder)
+    - Implied values (e.g. emotional language about money → create "Financial Security" value)
+    - Any named program, institution, or project → create vehicle
```

### 2b. Control Entity Type Ratios

Add a priority/weighting section to the prompt:

```
EXTRACTION PRIORITIES (in order):
1. Goals — extract these first and most aggressively
2. Stakeholders — extract all named people with any context
3. Vehicles — only extract if the user is clearly engaged with or considering the structure
4. Values — only create if no existing value covers the domain
5. Control Dimensions — only create when the briefing includes specific metrics about a vehicle
```

Or to suppress certain types entirely:

```
DO NOT extract control dimensions or values from this briefing. Focus exclusively on goals,
vehicles, and stakeholders.
```

### 2c. Control Create vs. Update Ratio

**Current behavior:** Rules 1-2 say "match existing → update, new → create" but the model tends to create duplicates when entity titles don't match exactly.

**To bias toward updates (reduce duplicates):**
```
MATCHING RULES:
- Use fuzzy matching. "Start investing in index funds" matches existing "Start Index Fund Portfolio".
- When a briefing mentions progress on a topic that has an existing goal, ALWAYS output an
  update to that goal rather than creating a new one.
- Only create a new goal when it is clearly a DIFFERENT objective, not a rephrasing of an
  existing one.
- Before creating any entity, check ALL existing entities for semantic overlap.
```

**To bias toward creates (more new entities):**
```
MATCHING RULES:
- Only match to an existing entity if the title is nearly identical.
- If in doubt, create a new entity — the user can merge duplicates later.
```

### 2d. Control Field Specificity

**To get richer field data:**
```
FIELD REQUIREMENTS:
- Every goal MUST have: title, description, successCriteria, targetDate. Infer dates from
  context (e.g. "by next semester" → 2026-09-01).
- Every stakeholder MUST have: name, organization, role, relationshipStrength (estimate from tone).
- Every vehicle MUST have: title, description, type, status, institution (if applicable).
- For control dimensions, include an icon emoji and a 0-100 value inferred from the briefing
  (e.g. "my GPA is 3.2" → value: 80, since 4.0 = 100).
```

**To get minimal field data (just titles/names):**
```
Keep data fields minimal. Only include fields explicitly mentioned in the briefing.
Do not infer or fill in fields the user didn't state.
```

### 2e. Control Tone of Reasons

```
For each operation's "reason" field:
- Keep it under 15 words
- Write from the system's perspective, not the user's
- Format: "[Action verb] because [evidence from briefing]"
- Example: "Creating because user explicitly stated desire to learn Rust by Q3"
```

### 2f. Control Vehicle-Goal Links

```
LINKING RULES:
- Create a vehicleGoal link whenever a vehicle is mentioned IN THE CONTEXT of achieving a goal.
- Do not create speculative links. The briefing must clearly imply the vehicle helps the goal.
- The "leverage" field should be a specific mechanism, not a vague statement.
  Good: "Provides access to faculty mentors for research guidance"
  Bad: "Helps with the goal"
```

---

## 3. Gemini Config Tuning (small code changes)

File: `apps/web/src/app/api/briefing/parse/route.ts`, lines 111-120.

### 3a. Temperature

```typescript
config: {
  temperature: 0.3,  // Current: conservative, deterministic
```

| Value | Behavior |
|-------|----------|
| 0.0   | Most deterministic. Same briefing → same output every time. Fewer entities, less creative inference. |
| 0.3   | **Current.** Slight variation. Good for structured extraction. |
| 0.5   | More variety. The model will infer more entities and be more creative with reasons/descriptions. |
| 0.8   | High creativity. Used by `goals/suggest`. Would cause more speculative entity extraction. |
| 1.0+  | Too noisy for structured JSON output. High risk of malformed JSON. |

**Recommendation:** Stay at 0.1-0.3 for parsing, 0.5-0.8 for suggestion-type features.

### 3b. Max Output Tokens

```typescript
maxOutputTokens: 8000,  // Current
```

- A complex briefing with 20+ operations and links can hit 4000-6000 tokens.
- If you see truncated JSON (502 errors), increase to 12000.
- If you want to limit operation count indirectly, decrease to 4000 (the model will self-limit).

### 3c. Thinking Budget

```typescript
thinkingConfig: { thinkingBudget: 0 },  // Current: disabled
```

- `0` = no chain-of-thought. Faster, cheaper, all token budget goes to the JSON response.
- Setting `thinkingBudget: 2000` lets the model "reason" before responding. This can improve:
  - Fuzzy matching against existing entities
  - Correct status inference (e.g. figuring out ACTIVE vs BLOCKED from context)
  - Better deduplication
- Trade-off: slower, uses more tokens, and the thinking tokens eat into `maxOutputTokens`.

### 3d. Model Selection

In `packages/shared/src/lib/gemini.ts`:

```typescript
// Free/Pro tier:
return process.env.GEMINI_MODEL || 'gemini-2.5-flash'    // Fast, cheap, decent

// Max tier:
return process.env.GEMINI_MODEL_MAX || 'gemini-2.5-pro'   // Slower, better reasoning
```

- **Flash** is good for straightforward extraction. Tends to be more literal.
- **Pro** is better at: fuzzy matching, nuanced status inference, complex stakeholder relationships, inferring values from emotional language.
- You can also set `GEMINI_MODEL=gemini-2.5-flash-lite` for faster/cheaper results during development.

### 3e. Response MIME Type (Structured Output)

The briefing parse route does NOT use `responseMimeType: 'application/json'` (unlike `goals/suggest`). Adding it forces the model to output valid JSON:

```typescript
config: {
  systemInstruction: systemPrompt,
  temperature: 0.3,
  maxOutputTokens: 8000,
  responseMimeType: 'application/json',  // ADD THIS
  thinkingConfig: { thinkingBudget: 0 },
},
```

**Benefit:** Eliminates the markdown-fence stripping code and 502 JSON parse errors.
**Trade-off:** Slightly more rigid output. Some models produce less detailed `reason` fields.

---

## 4. Context Window Tuning (what the model sees)

### 4a. Existing Entity Context

Currently (lines 37-61), the parse route fetches ALL entities globally (no userId filter):

```typescript
prisma.goal.findMany({
  select: { id: true, title: true, status: true, description: true },
})
```

**Issues:**
1. **Security**: Fetches all users' entities, not just the current user's.
2. **Noise**: With many users, the context becomes huge and the model confuses entities across users.

**Fix: scope to current user:**
```typescript
const userId = await requireAuthUserId()
const [goals, vehicles, stakeholders, values] = await Promise.all([
  prisma.goal.findMany({
    where: { userId },
    select: { id: true, title: true, status: true, description: true },
  }),
  // ... same for vehicles, stakeholders, values
])
```

### 4b. Control How Much Context Is Sent

If you have 50+ goals, the entity list in the system prompt becomes very long, pushing the actual briefing text further from the model's attention window.

**Options:**
1. **Limit to recent/active entities:**
   ```typescript
   prisma.goal.findMany({
     where: { userId, status: { in: ['ACTIVE', 'BLOCKED', 'WAITING'] } },
     orderBy: { updatedAt: 'desc' },
     take: 20,
   })
   ```

2. **Send only titles (not descriptions):**
   ```typescript
   Existing goals: ${JSON.stringify(goals.map(g => ({ id: g.id, title: g.title, status: g.status })))}
   // Already doing this ^, but descriptions are also selected — remove description from select
   ```

3. **Group by value/domain:**
   ```
   Existing goals by value:
   Financial Security: "Start Index Fund Portfolio" (ACTIVE), "Launch Freelance Practice" (ACTIVE)
   Career Growth: "Secure TA Position" (ACTIVE), "Publish Paper" (ACTIVE)
   ```
   This helps the model match incoming briefing text to the right domain.

---

## 5. Architecture-Level Changes

### 5a. Add Few-Shot Examples to the Prompt

The single most impactful change. Add 1-2 examples showing exactly the output format you want:

```typescript
const systemPrompt = `...existing prompt...

EXAMPLE:
Briefing: "Met with Sarah from the VC firm yesterday. She's interested in our pitch but wants
to see more traction first. We need to hit 1000 MAU by July. Also, I've been thinking about
starting a blog to build a personal brand."

Output:
{
  "summary": "Founder reports investor meeting with traction requirement and considers starting a blog.",
  "operations": [
    {
      "type": "update",
      "entity": "stakeholder",
      "reason": "New interaction with existing investor contact",
      "data": { "name": "Sarah", "notes": "Interested but wants 1000 MAU traction first", "relationshipStrength": 55 },
      "existingId": "abc-123"
    },
    {
      "type": "create",
      "entity": "goal",
      "reason": "Explicit traction target from investor feedback",
      "data": { "title": "Reach 1000 MAU", "description": "Hit 1000 monthly active users to satisfy investor requirements", "status": "ACTIVE", "successCriteria": "1000 MAU", "targetDate": "2026-07-01" }
    },
    {
      "type": "create",
      "entity": "vehicle",
      "reason": "User is considering starting a blog for personal branding",
      "data": { "title": "Personal Blog", "type": "PLATFORM", "status": "IDENTIFIED", "description": "Blog for building personal brand and thought leadership" }
    }
  ],
  "links": [
    { "type": "vehicleGoal", "vehicleTitle": "Personal Blog", "goalTitle": "Build Personal Brand Online", "leverage": "Provides a public platform for thought leadership and audience building" }
  ]
}
`
```

### 5b. Add a Validation/Post-Processing Step

Currently, the raw Gemini output goes straight to the client. Add a validation layer between parse and respond:

```typescript
// After JSON.parse(jsonStr):
const parsed = JSON.parse(jsonStr)

// Validate operations
parsed.operations = parsed.operations.filter(op => {
  // Remove operations with missing required fields
  if (op.entity === 'goal' && !op.data.title) return false
  if (op.entity === 'stakeholder' && !op.data.name) return false
  if (op.entity === 'vehicle' && !op.data.title) return false
  
  // Remove updates that reference non-existent IDs
  if (op.type === 'update' && op.existingId) {
    const exists = [...goals, ...vehicles, ...stakeholders, ...values]
      .some(e => e.id === op.existingId)
    if (!exists) return false
  }
  
  // Deduplicate: remove creates that match existing entities
  if (op.type === 'create' && op.entity === 'goal') {
    const dup = goals.find(g => 
      g.title.toLowerCase().includes(op.data.title.toLowerCase()) ||
      op.data.title.toLowerCase().includes(g.title.toLowerCase())
    )
    if (dup) {
      op.type = 'update'
      op.existingId = dup.id
    }
  }
  
  return true
})
```

### 5c. Two-Pass Extraction (high effort, high quality)

Split parsing into two LLM calls:

**Pass 1 — Entity Extraction (low temperature):**
```
Extract all entities from this briefing. Output JSON with entity types and raw data.
Do not worry about matching to existing entities.
Temperature: 0.1
```

**Pass 2 — Matching & Enrichment (with context):**
```
Given these extracted entities and the user's existing data, determine:
1. Which extracted entities match existing ones (output updates)
2. Which are genuinely new (output creates)
3. What links should be created
Temperature: 0.3
```

**Benefits:** Better matching accuracy, fewer false creates. Pass 1 focuses purely on extraction quality; Pass 2 focuses on deduplication.
**Cost:** 2x API calls, 2x latency, 2x token usage.

### 5d. Add a JSON Schema Constraint (Gemini Structured Output)

Gemini supports `responseSchema` to enforce exact JSON structure:

```typescript
const completion = await client.models.generateContent({
  model: entitlement.model,
  contents: `Parse this briefing...\n\n${text}`,
  config: {
    systemInstruction: systemPrompt,
    temperature: 0.3,
    maxOutputTokens: 8000,
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        operations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['create', 'update'] },
              entity: { type: 'string', enum: ['goal', 'vehicle', 'stakeholder', 'controlDimension', 'value'] },
              reason: { type: 'string' },
              data: { type: 'object' },
              existingId: { type: 'string' },
            },
            required: ['type', 'entity', 'reason', 'data'],
          },
        },
        links: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              vehicleTitle: { type: 'string' },
              goalTitle: { type: 'string' },
              leverage: { type: 'string' },
            },
          },
        },
      },
      required: ['summary', 'operations', 'links'],
    },
    thinkingConfig: { thinkingBudget: 0 },
  },
})
```

**Benefit:** Eliminates JSON parse errors entirely. Model is forced into the exact schema.

### 5e. Add a Confidence Score

Add a confidence field so the UI can sort/filter:

```
For each operation, include a "confidence" field (0.0-1.0):
- 1.0 = entity is explicitly stated with all fields present
- 0.7 = entity is clearly implied but some fields are inferred
- 0.4 = entity is speculative, inferred from weak signals
- 0.1 = entity is very uncertain, included for completeness

The UI will show confidence as a visual indicator and auto-reject operations below 0.4.
```

Then in the apply route, skip low-confidence operations:
```typescript
const selectedOps = parseResult.operations
  .filter(op => (op.confidence ?? 1) >= 0.4)
```

---

## 6. Quick-Start Tuning Recipes

### "I want fewer, more precise objects"
1. Temperature → 0.1
2. Add to prompt: "Only extract entities that are explicitly stated. Do not infer."
3. Add confidence scores, filter < 0.5

### "I want richer objects with all fields populated"
1. Add field requirements to prompt (section 2d)
2. Enable thinking budget: `thinkingBudget: 2000`
3. Use Pro model for paid tier

### "I want better matching against existing entities"
1. Scope entity context to current user (section 4a)
2. Add fuzzy matching rules (section 2c)
3. Add validation/dedup post-processing (section 5b)

### "I want to control exactly which entity types are extracted"
1. Add extraction priorities (section 2b)
2. Or: suppress types entirely in the prompt

### "I want deterministic, reproducible output"
1. Temperature → 0.0
2. Add `responseMimeType: 'application/json'` + `responseSchema`
3. Disable thinking: `thinkingBudget: 0`
4. Use Flash model (more deterministic than Pro)
