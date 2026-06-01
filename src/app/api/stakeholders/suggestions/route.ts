import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface Capability {
  type: 'willingness' | 'capability'
  description: string
  condition: string | null
}

interface SuggestedStakeholder {
  stakeholderId: string
  name: string
  organization: string | null
  role: string | null
  matchingCapabilities: Capability[]
  relevanceScore: number
}

const KEYWORDS_MAP: Record<string, string[]> = {
  // Academic / education
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

  // Fundraising / business
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

  // General
  career: ['mentorship', 'guidance', 'recommendation', 'referral', 'career'],
  network: ['introductions', 'network', 'connections', 'referral'],
  mentor: ['mentorship', 'guidance', 'mentor', 'advising'],
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

    // Direct keyword overlap between goal text and capability description
    const capWords = capDesc.split(/\s+/)
    for (const word of capWords) {
      if (word.length > 3 && lower.includes(word)) score += 2
    }

    // Check expanded keyword associations
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
    if (matched.length > 0) {
      suggestions.push({
        stakeholderId: s.id,
        name: s.name,
        organization: s.organization,
        role: s.role,
        matchingCapabilities: matched,
        relevanceScore: score,
      })
    }
  }

  suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore)

  return NextResponse.json(suggestions.slice(0, 10))
}
