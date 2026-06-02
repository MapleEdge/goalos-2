import { NextResponse } from 'next/server'
import { getGeminiClient, getGeminiModel } from '@/lib/gemini'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const client = getGeminiClient()
  if (!client) {
    return NextResponse.json(
      { error: 'Gemini API key not configured' },
      { status: 503 }
    )
  }

  const { text } = await request.json()
  if (!text || typeof text !== 'string' || text.trim().length < 10) {
    return NextResponse.json(
      { error: 'Briefing text is too short' },
      { status: 400 }
    )
  }

  // Fetch existing entities so the AI can reference or update them
  const [goals, vehicles, stakeholders, values] = await Promise.all([
    prisma.goal.findMany({
      select: { id: true, title: true, status: true, description: true },
    }),
    prisma.vehicle.findMany({
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        description: true,
      },
    }),
    prisma.stakeholder.findMany({
      select: {
        id: true,
        name: true,
        organization: true,
        role: true,
      },
    }),
    prisma.value.findMany({
      select: { id: true, label: true },
    }),
  ])

  const systemPrompt = `You are a strategic life-management AI that parses freeform briefings into structured entity operations for a goal-tracking system called GoalOS.

The system has these entity types:
- Goal: { title, description, status (ACTIVE|COMPLETED|PAUSED|ARCHIVED), successCriteria, targetDate }
- Vehicle: { title, description, type (EDUCATION|EMPLOYMENT|BUSINESS|ASSET|PLATFORM|NETWORK|ORGANIZATION|EVENT_SERIES|SKILL|OTHER), status (IDENTIFIED|RESEARCHING|ACQUIRING|BUILDING|ACTIVE|DORMANT|RETIRED), institution }
- Stakeholder: { name, organization, role, notes, relationshipStrength (0-100) }
- ControlDimension: { vehicleId, name, value (0-100), description, icon (emoji) }
- Value: { label, description, rank (higher=more important) }

Available values: ${JSON.stringify(values.map((v) => ({ id: v.id, label: v.label })))}

Existing goals: ${JSON.stringify(goals.map((g) => ({ id: g.id, title: g.title, status: g.status })))}

Existing vehicles: ${JSON.stringify(vehicles.map((v) => ({ id: v.id, title: v.title, type: v.type, status: v.status })))}

Existing stakeholders: ${JSON.stringify(stakeholders.map((s) => ({ id: s.id, name: s.name, organization: s.organization })))}

RULES:
1. For entities that clearly match an existing one, output an "update" operation with the existing id.
2. For new entities mentioned in the briefing, output a "create" operation.
3. Extract ALL actionable entities — goals, vehicles, stakeholders, control dimensions, values.
4. Be thorough but precise. Only include entities clearly implied by the briefing.
5. For control dimensions, always reference a vehicle (existing id or a new vehicle you're also creating).
6. Include a short "reason" for each operation explaining why.
7. For vehicle goal links, output them as "link" operations.

Respond with ONLY valid JSON (no markdown fences) in this exact format:
{
  "summary": "One-paragraph summary of what the briefing describes",
  "operations": [
    {
      "type": "create" | "update",
      "entity": "goal" | "vehicle" | "stakeholder" | "controlDimension" | "value",
      "reason": "Why this operation is proposed",
      "data": { ...fields },
      "existingId": "uuid (only for updates)"
    }
  ],
  "links": [
    {
      "type": "vehicleGoal",
      "vehicleTitle": "...",
      "goalTitle": "...",
      "leverage": "How the vehicle helps this goal"
    }
  ]
}`

  const completion = await client.models.generateContent({
    model: getGeminiModel(),
    contents: `Parse this briefing into structured GoalOS entity operations:\n\n${text}`,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.3,
      maxOutputTokens: 8000,
      thinkingConfig: { thinkingBudget: 0 },
    },
  })

  const raw = (completion.text || '').trim()

  // Strip markdown fences if the model wraps them
  const jsonStr = raw.startsWith('```')
    ? raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    : raw

  try {
    const parsed = JSON.parse(jsonStr)
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json(
      { error: 'Failed to parse AI response', raw },
      { status: 502 }
    )
  }
}
