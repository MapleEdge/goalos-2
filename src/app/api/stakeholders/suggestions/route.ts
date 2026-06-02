import { NextResponse } from 'next/server'
import { getGeminiClient, getGeminiModel } from '@/lib/gemini'
import { prisma } from '@/lib/prisma'
import { desanitize, sanitize } from '@/lib/sanitize'

interface Capability {
  type: 'willingness' | 'capability'
  description: string
  condition: string | null
  capabilityScore?: number
  willingnessScore?: number
}

interface ValueExchangeAsset {
  asset: string
  category: string
  notes?: string
}

interface UserAsset {
  asset: string
  category: string
}

interface ValueExchangeSuggestion {
  strategy: string
  reasoning: string
  userAssetUsed: string | null
  stakeholderMotivator: string
  feasibility: 'high' | 'medium' | 'low'
}

interface SuggestedStakeholder {
  stakeholderId: string
  name: string
  organization: string | null
  role: string | null
  matchingCapabilities: Capability[]
  relevanceScore: number
  capabilityScore: number
  willingnessScore: number
  valueGap: number // how much willingness is missing (0 = willing, 100 = completely unwilling)
  valueExchangeSuggestions: ValueExchangeSuggestion[]
}

// ─── Keyword-based relevance (fallback when Gemini unavailable) ──

const KEYWORDS_MAP: Record<string, string[]> = {
  university: [
    'tuition',
    'gpa',
    'degree',
    'university',
    'college',
    'education',
    'enrolled',
    'course',
    'class',
    'teaching',
    'ta position',
    'recommendation',
  ],
  degree: [
    'tuition',
    'gpa',
    'degree',
    'university',
    'college',
    'education',
    'enrolled',
    'graduation',
  ],
  research: [
    'paper',
    'research',
    'publication',
    'co-author',
    'peer review',
    'lab',
    'compute',
    'dataset',
    'conference',
    'submit',
    'mentor',
  ],
  publish: [
    'paper',
    'publication',
    'co-author',
    'conference',
    'submit',
    'journal',
    'review',
  ],
  ta: [
    'ta ',
    'teaching assistant',
    'teaching',
    'recommendation',
    'grading',
    'tutoring',
    'referral',
  ],
  teach: [
    'teaching',
    'ta ',
    'tutoring',
    'recommendation',
    'study group',
    'mentor',
  ],
  recommendation: [
    'recommendation',
    'letter',
    'reference',
    'endorsement',
    'grad school',
    'graduate',
    'application',
    'professor',
    'faculty',
  ],
  letter: [
    'recommendation',
    'reference',
    'endorsement',
    'grad school',
    'application',
  ],
  raise: [
    'investment',
    'investor',
    'fundraising',
    'seed',
    'pre-seed',
    'angel',
    'vc',
    'fund',
    'round',
    'capital',
    'introductions',
  ],
  startup: [
    'investment',
    'fundraising',
    'seed',
    'accelerator',
    'startup',
    'mvp',
    'traction',
    'demo',
    'pitch',
  ],
  fund: [
    'financial',
    'investment',
    'fund',
    'tuition',
    'capital',
    'angel',
    'seed',
  ],
  invest: ['investment', 'investor', 'seed', 'angel', 'vc', 'fund'],
  career: ['mentorship', 'guidance', 'recommendation', 'referral', 'career'],
  network: ['introductions', 'network', 'connections', 'referral'],
  mentor: ['mentorship', 'guidance', 'mentor', 'advising'],
  housing: ['apartment', 'lease', 'housing', 'rent', 'landlord', 'campus'],
  apartment: ['housing', 'lease', 'rent', 'security deposit'],
}

function computeRelevance(
  goalText: string,
  capabilities: Capability[]
): { matched: Capability[]; score: number } {
  const lower = goalText.toLowerCase()
  const goalWords = lower.split(/\s+/)
  const matched: Capability[] = []

  for (const cap of capabilities) {
    const capDesc = cap.description.toLowerCase()
    const capCond = (cap.condition || '').toLowerCase()
    let score = 0

    const capWords = capDesc.split(/\s+/)
    for (const word of capWords) {
      if (word.length > 3 && lower.includes(word)) score += 2
    }

    for (const goalWord of goalWords) {
      const relatedTerms = KEYWORDS_MAP[goalWord]
      if (!relatedTerms) continue
      for (const term of relatedTerms) {
        if (capDesc.includes(term) || capCond.includes(term)) {
          score += 1
        }
      }
    }

    if (score > 0) {
      matched.push(cap)
    }
  }

  return {
    matched,
    score:
      matched.length > 0
        ? matched.reduce((sum, _, i) => sum + (capabilities.length - i), 0)
        : 0,
  }
}

// ─── Gemini-powered value exchange suggestion generator ──────────

async function generateValueExchangeSuggestions(
  goalTitle: string,
  goalDescription: string,
  stakeholderName: string,
  stakeholderRole: string | null,
  stakeholderNotes: string | null,
  matchingCapabilities: Capability[],
  valueExchangeAssets: ValueExchangeAsset[],
  userAssets: UserAsset[]
): Promise<ValueExchangeSuggestion[]> {
  const client = getGeminiClient()
  if (!client) return []

  const bestCap = matchingCapabilities[0]
  if (!bestCap) return []

  const capScore = bestCap.capabilityScore ?? 50
  const willScore = bestCap.willingnessScore ?? 50

  // Only generate exchange suggestions when there is a value gap
  if (willScore >= 60) return []

  const prompt = `You are a strategic advisor helping someone achieve their goals through stakeholder relationships.

GOAL: ${sanitize(goalTitle)}
GOAL DETAILS: ${sanitize(goalDescription || 'No additional details')}

STAKEHOLDER: ${sanitize(stakeholderName)}
ROLE: ${sanitize(stakeholderRole || 'Unknown')}
NOTES: ${sanitize(stakeholderNotes || 'None')}

RELEVANT CAPABILITY: ${sanitize(bestCap.description)}
- Capability Score: ${capScore}/100 (how well they can deliver)
- Willingness Score: ${willScore}/100 (how likely they are to help)
- Condition: ${sanitize(bestCap.condition || 'None stated')}

WHAT MOTIVATES THIS STAKEHOLDER (things they value/want):
${valueExchangeAssets.map((a) => `- ${sanitize(a.asset)} (${sanitize(a.category)})${a.notes ? ': ' + sanitize(a.notes) : ''}`).join('\n')}

WHAT THE USER CAN OFFER:
${userAssets.length > 0 ? userAssets.map((a) => `- ${sanitize(a.asset)} (${sanitize(a.category)})`).join('\n') : '- Nothing specific listed'}

The stakeholder has HIGH capability (${capScore}/100) but LOW willingness (${willScore}/100).
The user needs to bridge this "value gap" — the gap between what the stakeholder can do and what they're willing to do.

Generate exactly 3 creative but realistic VALUE EXCHANGE strategies. Each strategy should:
1. Identify something the stakeholder wants (from their motivators list)
2. Match it with something the user can offer (from their assets or inferred abilities)
3. Explain how this exchange would increase the stakeholder's willingness
4. Be specific, actionable, and grounded in the stakeholder's known motivations

Think of this as a VALUE EXCHANGE — what can the user give to get what they need?
Be creative but reasonable. Consider direct exchanges, indirect favors, social dynamics, and strategic positioning.

Respond ONLY with a JSON array of exactly 3 objects:
[
  {
    "strategy": "One-sentence description of the exchange strategy",
    "reasoning": "Why this would work given the stakeholder's motivations",
    "userAssetUsed": "Which user asset is being leveraged (or null if general)",
    "stakeholderMotivator": "Which stakeholder motivator this targets",
    "feasibility": "high" | "medium" | "low"
  }
]

JSON only, no markdown, no explanation.`

  try {
    const response = await client.models.generateContent({
      model: getGeminiModel(),
      contents: prompt,
    })

    const text = response.text?.trim() || ''
    // Strip markdown code fences if present
    const jsonStr = text
      .replace(/^```(?:json)?\n?/i, '')
      .replace(/\n?```$/i, '')
    const parsed = JSON.parse(jsonStr)

    if (!Array.isArray(parsed)) return []

    return parsed
      .slice(0, 3)
      .map(
        (s: {
          strategy?: string
          reasoning?: string
          userAssetUsed?: string | null
          stakeholderMotivator?: string
          feasibility?: string
        }) => ({
          strategy: desanitize(s.strategy || ''),
          reasoning: desanitize(s.reasoning || ''),
          userAssetUsed: s.userAssetUsed ? desanitize(s.userAssetUsed) : null,
          stakeholderMotivator: desanitize(s.stakeholderMotivator || ''),
          feasibility: (['high', 'medium', 'low'].includes(s.feasibility || '')
            ? s.feasibility
            : 'medium') as 'high' | 'medium' | 'low',
        })
      )
  } catch {
    return []
  }
}

// ─── Main endpoint ───────────────────────────────────────────────

export async function POST(request: Request) {
  const body = await request.json()
  const goalText = [
    body.title || '',
    body.description || '',
    body.successCriteria || '',
  ]
    .join(' ')
    .trim()

  if (!goalText) {
    return NextResponse.json([])
  }

  const stakeholders = await prisma.stakeholder.findMany()
  const suggestions: SuggestedStakeholder[] = []

  for (const s of stakeholders) {
    const caps = (s.capabilities as Capability[] | null) || []
    if (caps.length === 0) continue

    const { matched, score } = computeRelevance(goalText, caps)
    if (matched.length === 0) continue

    // Compute aggregate capability and willingness scores from matched capabilities
    const avgCapability =
      matched.reduce((sum, c) => sum + (c.capabilityScore ?? 50), 0) /
      matched.length
    const avgWillingness =
      matched.reduce((sum, c) => sum + (c.willingnessScore ?? 50), 0) /
      matched.length
    const valueGap = Math.max(0, 100 - avgWillingness)

    suggestions.push({
      stakeholderId: s.id,
      name: s.name,
      organization: s.organization,
      role: s.role,
      matchingCapabilities: matched,
      relevanceScore: score,
      capabilityScore: Math.round(avgCapability),
      willingnessScore: Math.round(avgWillingness),
      valueGap: Math.round(valueGap),
      valueExchangeSuggestions: [],
    })
  }

  suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore)
  const top = suggestions.slice(0, 10)

  // For stakeholders with a value gap (low willingness), generate exchange suggestions
  const exchangePromises = top.map(async (s) => {
    if (s.valueGap <= 40) return // willing enough, no exchange needed

    const stakeholder = stakeholders.find((st) => st.id === s.stakeholderId)
    if (!stakeholder) return

    const veAssets =
      (stakeholder.valueExchangeAssets as ValueExchangeAsset[] | null) || []
    const uAssets = (stakeholder.userAssets as UserAsset[] | null) || []

    if (veAssets.length === 0) return

    s.valueExchangeSuggestions = await generateValueExchangeSuggestions(
      body.title || '',
      body.description || '',
      s.name,
      s.role,
      stakeholder.notes,
      s.matchingCapabilities,
      veAssets,
      uAssets
    )
  })

  await Promise.all(exchangePromises)

  return NextResponse.json(top)
}
