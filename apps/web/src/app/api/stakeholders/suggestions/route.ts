import { getGeminiClient, getGeminiModel } from '@goalos/shared/lib/gemini'
import { prisma } from '@goalos/shared/lib/prisma'
import { desanitize, sanitize } from '@goalos/shared/lib/sanitize'
import type {
  CapabilityEntry,
  SuggestedStakeholder,
  UserAsset,
  ValueExchangeAsset,
  ValueExchangeSuggestion,
} from '@goalos/shared/types'
import { NextResponse } from 'next/server'

// ─── Keyword-based relevance scoring ─────────────────────────────

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

function getCapText(cap: CapabilityEntry): string {
  return cap.capability || cap.description || ''
}

function computeRelevance(
  goalText: string,
  capabilities: CapabilityEntry[]
): { matched: CapabilityEntry[]; score: number } {
  const lower = goalText.toLowerCase()
  const goalWords = lower.split(/\s+/)
  const matched: CapabilityEntry[] = []

  for (const cap of capabilities) {
    const capText = getCapText(cap).toLowerCase()
    const capWill = (cap.willingness || '').toLowerCase()
    const capCond = (cap.condition || '').toLowerCase()
    let score = 0

    const capWords = capText.split(/\s+/)
    for (const word of capWords) {
      if (word.length > 3 && lower.includes(word)) score += 2
    }

    // Also check willingness text for relevant keywords
    const willWords = capWill.split(/\s+/)
    for (const word of willWords) {
      if (word.length > 3 && lower.includes(word)) score += 1
    }

    for (const goalWord of goalWords) {
      const relatedTerms = KEYWORDS_MAP[goalWord]
      if (!relatedTerms) continue
      for (const term of relatedTerms) {
        if (
          capText.includes(term) ||
          capCond.includes(term) ||
          capWill.includes(term)
        ) {
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
  matchedCapabilities: CapabilityEntry[],
  valueExchangeAssets: ValueExchangeAsset[],
  userAssets: UserAsset[]
): Promise<ValueExchangeSuggestion[]> {
  const client = getGeminiClient()
  if (!client) return []
  if (matchedCapabilities.length === 0 || valueExchangeAssets.length === 0)
    return []

  const capsBlock = matchedCapabilities
    .map(
      (c, i) =>
        `${i + 1}. Capability: ${sanitize(getCapText(c))}\n   Willingness: ${sanitize(c.willingness || 'unknown')}\n   Condition: ${sanitize(c.condition || 'none stated')}`
    )
    .join('\n')

  const prompt = `You are a strategic advisor helping someone achieve their goals through stakeholder relationships. You think in terms of VALUE EXCHANGE — what can be offered to get what is needed.

GOAL: ${sanitize(goalTitle)}
GOAL DETAILS: ${sanitize(goalDescription || 'No additional details')}

STAKEHOLDER: ${sanitize(stakeholderName)}
ROLE: ${sanitize(stakeholderRole || 'Unknown')}
NOTES: ${sanitize(stakeholderNotes || 'None')}

STAKEHOLDER CAPABILITIES (what they can do + how willing they are):
${capsBlock}

WHAT MOTIVATES THIS STAKEHOLDER (things they value/want):
${valueExchangeAssets.map((a) => `- ${sanitize(a.asset)} (${sanitize(a.category)})${a.notes ? `: ${sanitize(a.notes)}` : ''}`).join('\n')}

WHAT THE USER CAN OFFER:
${userAssets.length > 0 ? userAssets.map((a) => `- ${sanitize(a.asset)} (${sanitize(a.category)})`).join('\n') : '- Nothing specific listed'}

TASK: Analyze the willingness descriptions above. If the stakeholder is UNWILLING or has LOW willingness for what the user needs, generate exactly 3 creative VALUE EXCHANGE strategies to bridge the gap.

Each strategy should:
1. Identify something the stakeholder wants (from their motivators)
2. Match it with something the user can offer (from their assets or inferred)
3. Explain why this exchange would increase willingness
4. Be specific, actionable, and grounded in the known motivations

If the stakeholder is already willing (willingness descriptions suggest they are happy to help), return an empty array [].

Respond ONLY with a JSON array of 0 or 3 objects:
[
  {
    "strategy": "One-sentence description of the exchange strategy",
    "reasoning": "Why this would work given the stakeholder's motivations and willingness barriers",
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
    const jsonStr = text
      .replace(/^```(?:json)?\n?/i, '')
      .replace(/\n?```$/i, '')
    const parsed = JSON.parse(jsonStr)

    if (!Array.isArray(parsed)) return []
    if (parsed.length === 0) return []

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
    const caps = (s.capabilities as CapabilityEntry[] | null) || []
    if (caps.length === 0) continue

    const { matched, score } = computeRelevance(goalText, caps)
    if (matched.length === 0) continue

    suggestions.push({
      stakeholderId: s.id,
      name: s.name,
      organization: s.organization,
      role: s.role,
      capabilities: matched,
      relevanceScore: score,
      valueExchangeSuggestions: [],
    })
  }

  suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore)
  const top = suggestions.slice(0, 10)

  // For each suggested stakeholder, check if Gemini should generate exchange suggestions
  const exchangePromises = top.map(async (s) => {
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
      s.capabilities,
      veAssets,
      uAssets
    )
  })

  await Promise.all(exchangePromises)

  return NextResponse.json(top)
}
