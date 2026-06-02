// Relationship-health scoring used by the "Improve Relationships" workflow.
//
// Pure functions over the existing graph (stakeholders + goals + relationship
// edges). Produces a prioritized list of which relationships to improve, why,
// and the concrete next step — all deterministic so it works without AI.

export type RelationshipTier = 'STRONG' | 'STEADY' | 'AT_RISK' | 'DORMANT'

export type OutreachChannel = 'MEETING' | 'EMAIL' | 'CALL' | 'MESSAGE' | 'NOTE'

export interface RelationshipHealthInputStakeholder {
  id: string
  name: string
  organization: string | null
  role: string | null
  relationshipStrength: number
  lastInteraction: Date | string | null
  notes: string | null
}

export interface RelationshipHealthInputGoal {
  id: string
  title: string
  status: string
}

export interface RelationshipHealthInputRelationship {
  fromType: string
  fromId: string
  toType: string
  toId: string
}

export interface RecommendedStep {
  title: string
  channel: OutreachChannel
}

export interface RelationshipHealth {
  stakeholderId: string
  name: string
  organization: string | null
  role: string | null
  relationshipStrength: number
  healthScore: number // 0-100, strength decayed by staleness vs cadence
  tier: RelationshipTier
  daysSinceContact: number | null
  suggestedCadenceDays: number
  overdueDays: number // days past the suggested cadence (0 if on track)
  linkedGoals: string[]
  reasons: string[]
  recommendedStep: RecommendedStep
  talkingPoints: string[]
  priorityScore: number // higher = improve sooner
}

// How often we expect contact, based on how invested the relationship is.
// Goal-linked and strong relationships warrant tighter cadences; weak/unlinked
// ones can be nurtured more slowly.
function suggestedCadenceDays(
  strength: number,
  linkedGoalCount: number
): number {
  if (linkedGoalCount >= 2) return 14
  if (linkedGoalCount === 1) return 21
  if (strength >= 70) return 30
  if (strength >= 40) return 45
  return 60
}

function daysBetween(now: number, then: number): number {
  return Math.floor((now - then) / (1000 * 60 * 60 * 24))
}

function tierFromScore(score: number): RelationshipTier {
  if (score >= 70) return 'STRONG'
  if (score >= 45) return 'STEADY'
  if (score >= 20) return 'AT_RISK'
  return 'DORMANT'
}

function buildLinkedGoals(
  stakeholderId: string,
  goals: RelationshipHealthInputGoal[],
  relationships: RelationshipHealthInputRelationship[]
): string[] {
  const goalById = new Map(goals.map((g) => [g.id, g]))
  const titles = new Set<string>()
  for (const rel of relationships) {
    let goalId: string | null = null
    if (
      rel.fromType === 'STAKEHOLDER' &&
      rel.fromId === stakeholderId &&
      rel.toType === 'GOAL'
    ) {
      goalId = rel.toId
    } else if (
      rel.toType === 'STAKEHOLDER' &&
      rel.toId === stakeholderId &&
      rel.fromType === 'GOAL'
    ) {
      goalId = rel.fromId
    }
    if (goalId) {
      const goal = goalById.get(goalId)
      if (goal) titles.add(goal.title)
    }
  }
  return Array.from(titles)
}

const HONORIFICS = new Set([
  'dr.',
  'dr',
  'prof.',
  'prof',
  'mr.',
  'mr',
  'ms.',
  'ms',
  'mrs.',
  'mrs',
])

// First name to address the person by, skipping leading honorifics so we don't
// produce awkward phrasing like "Reconnect with Dr.".
export function firstName(name: string): string {
  const parts = name.trim().split(/\s+/)
  for (const part of parts) {
    if (!HONORIFICS.has(part.toLowerCase())) return part
  }
  return name
}

function recommendStep(
  health: {
    daysSinceContact: number | null
    overdueDays: number
    relationshipStrength: number
    linkedGoals: string[]
  },
  name: string
): RecommendedStep {
  const first = firstName(name)
  const linked = health.linkedGoals.length > 0

  if (health.daysSinceContact === null) {
    return {
      title: `Log your first interaction with ${first}`,
      channel: 'NOTE',
    }
  }
  if (health.overdueDays > 0) {
    return {
      title: linked
        ? `Reconnect with ${first} — they support ${health.linkedGoals.length} active goal(s)`
        : `Re-engage ${first} before this relationship goes cold`,
      channel: health.overdueDays > 30 ? 'EMAIL' : 'MESSAGE',
    }
  }
  if (health.relationshipStrength < 40) {
    return {
      title: `Deepen the relationship with ${first} — set up a proper conversation`,
      channel: 'MEETING',
    }
  }
  return {
    title: `Keep momentum with ${first} — send a quick check-in`,
    channel: 'MESSAGE',
  }
}

function buildTalkingPoints(
  s: RelationshipHealthInputStakeholder,
  linkedGoals: string[],
  daysSinceContact: number | null
): string[] {
  const points: string[] = []
  if (linkedGoals.length > 0) {
    points.push(
      `Share an update on "${linkedGoals[0]}" and ask for their input`
    )
  }
  if (daysSinceContact !== null && daysSinceContact > 30) {
    points.push(
      `Acknowledge it's been a while (${daysSinceContact} days) and reconnect personally`
    )
  }
  if (s.role || s.organization) {
    const ctx = [s.role, s.organization].filter(Boolean).join(' at ')
    points.push(`Reference their work as ${ctx}`)
  }
  if (s.notes) {
    points.push(
      `Follow up on your note: "${s.notes.slice(0, 80)}${s.notes.length > 80 ? '…' : ''}"`
    )
  }
  if (points.length === 0) {
    points.push(
      `Ask an open question to learn what they're focused on right now`
    )
  }
  return points.slice(0, 4)
}

export function computeRelationshipHealth(
  stakeholders: RelationshipHealthInputStakeholder[],
  goals: RelationshipHealthInputGoal[],
  relationships: RelationshipHealthInputRelationship[],
  now: number = Date.now()
): RelationshipHealth[] {
  const activeGoals = goals.filter((g) => g.status === 'ACTIVE')

  const results = stakeholders.map((s) => {
    const linkedGoals = buildLinkedGoals(s.id, activeGoals, relationships)
    const cadence = suggestedCadenceDays(
      s.relationshipStrength,
      linkedGoals.length
    )

    const lastInteraction = s.lastInteraction
      ? new Date(s.lastInteraction).getTime()
      : null
    const daysSinceContact =
      lastInteraction !== null ? daysBetween(now, lastInteraction) : null
    const overdueDays =
      daysSinceContact !== null
        ? Math.max(0, daysSinceContact - cadence)
        : cadence

    // Health = strength, decayed by how far past cadence the contact is.
    // A never-contacted stakeholder is treated as fully overdue.
    const stalenessRatio =
      daysSinceContact === null ? 1 : Math.min(1, overdueDays / (cadence * 2))
    const healthScore = Math.round(
      Math.max(0, s.relationshipStrength * (1 - 0.6 * stalenessRatio))
    )
    const tier = tierFromScore(healthScore)

    const reasons: string[] = []
    if (linkedGoals.length > 0) {
      reasons.push(
        `Connected to ${linkedGoals.length} active goal${linkedGoals.length > 1 ? 's' : ''}`
      )
    }
    if (daysSinceContact === null) {
      reasons.push('No interaction logged yet')
    } else if (overdueDays > 0) {
      reasons.push(
        `Last contact ${daysSinceContact} days ago — ${overdueDays} day(s) past the ${cadence}-day cadence`
      )
    } else {
      reasons.push(`Last contact ${daysSinceContact} days ago — on track`)
    }
    if (s.relationshipStrength < 40) {
      reasons.push(`Low relationship strength (${s.relationshipStrength}%)`)
    }

    const recommendedStep = recommendStep(
      {
        daysSinceContact,
        overdueDays,
        relationshipStrength: s.relationshipStrength,
        linkedGoals,
      },
      s.name
    )
    const talkingPoints = buildTalkingPoints(s, linkedGoals, daysSinceContact)

    // Priority: improve goal-linked, overdue, and weak relationships first.
    const priorityScore =
      linkedGoals.length * 40 +
      overdueDays * 1.5 +
      (100 - s.relationshipStrength) * 0.5 +
      (daysSinceContact === null ? 30 : 0)

    return {
      stakeholderId: s.id,
      name: s.name,
      organization: s.organization,
      role: s.role,
      relationshipStrength: s.relationshipStrength,
      healthScore,
      tier,
      daysSinceContact,
      suggestedCadenceDays: cadence,
      overdueDays,
      linkedGoals,
      reasons,
      recommendedStep,
      talkingPoints,
      priorityScore: Math.round(priorityScore),
    }
  })

  return results.sort((a, b) => b.priorityScore - a.priorityScore)
}
