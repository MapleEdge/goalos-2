import { describe, expect, it } from 'vitest'

/**
 * Standalone complexity-based intent routing.
 *
 * This file deliberately re-implements the heuristics in isolation (rather than
 * importing from `src/lib/semantic`) so the routing logic can be tuned and
 * verified without touching production code. The idea: cheap requests
 * (navigation, help, "show all my goals") should be answered by the on-device
 * embedding model, while genuinely complex, entity-rich free text (e.g. "save
 * $5000 for a trip to Spain by December") should be routed to the cloud LLM.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SemanticIntent =
  | 'review_all'
  | 'progress'
  | 'work_on'
  | 'navigate'
  | 'schedule_query'
  | 'help'

/** `create_goal` is the free-form fall-through, same as the production API. */
type Intent = SemanticIntent | 'create_goal'

/** Where a given input should be classified. */
type Route = 'embeddings' | 'llm'

interface DetectedEntities {
  dates: string[]
  times: string[]
  names: string[]
  priorities: string[]
}

interface InputComplexity {
  wordCount: number
  clauseCount: number
  ambiguousTerms: string[]
}

interface QuickPattern {
  intent: Intent
  confidence: number
  page?: string
}

interface RoutingResult {
  route: Route
  intent: Intent
  score: number
  confidence: number
  usedQuickPattern: boolean
  entities: DetectedEntities
  complexity: InputComplexity
  page?: string
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Inherent complexity of each intent (0-100). Navigation/help are trivially
 * cheap; creating a goal from free text is the most demanding because it may
 * carry dates, amounts, and multiple clauses that the offline model can't parse.
 */
const INTENT_COMPLEXITY: Record<Intent, number> = {
  help: 5,
  navigate: 10,
  review_all: 18,
  schedule_query: 35,
  progress: 40,
  work_on: 45,
  create_goal: 70,
}

/**
 * Tiered confidence thresholds (0-1). A quick-pattern hit at/above SIMPLE is
 * trusted outright; AMBIGUOUS is the floor for trusting the offline path in the
 * uncertain middle band; below FALLBACK we hand off to the LLM.
 */
const CONFIDENCE_THRESHOLDS = {
  SIMPLE: 0.75,
  AMBIGUOUS: 0.5,
  FALLBACK: 0.5,
} as const

/** Complexity-score (0-100) cut points used by the router. */
const COMPLEXITY_THRESHOLDS = {
  SIMPLE_MAX: 35,
  COMPLEX_MIN: 60,
} as const

// ---------------------------------------------------------------------------
// Entity detection
// ---------------------------------------------------------------------------

const RELATIVE_DATES = [
  'today',
  'tomorrow',
  'yesterday',
  'tonight',
  'this week',
  'next week',
  'this weekend',
  'next weekend',
  'this month',
  'next month',
  'this year',
  'next year',
]

const WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
  'jan',
  'feb',
  'mar',
  'apr',
  'jun',
  'jul',
  'aug',
  'sep',
  'sept',
  'oct',
  'nov',
  'dec',
]

const NAMED_TIMES = ['noon', 'midnight', 'morning', 'afternoon', 'evening']

const PRIORITY_TERMS = [
  'urgent',
  'asap',
  'important',
  'critical',
  'crucial',
  'immediately',
  'high priority',
  'top priority',
  'highest priority',
]

/** Words we never treat as a person's name even when capitalised. */
const NON_NAME_WORDS = new Set(
  [...WEEKDAYS, ...MONTHS, ...RELATIVE_DATES, ...NAMED_TIMES, 'i'].map((w) =>
    w.toLowerCase()
  )
)

function uniq(values: string[]): string[] {
  return [...new Set(values)]
}

function matchAll(text: string, terms: string[]): string[] {
  const lower = text.toLowerCase()
  const found: string[] = []
  for (const term of terms) {
    const re = new RegExp(
      `\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`
    )
    if (re.test(lower)) found.push(term)
  }
  return found
}

/**
 * Identifies dates, times, person names and priority markers in the input.
 * Heuristic and intentionally lightweight — good enough to estimate how much
 * structured information a request carries.
 */
function detectEntities(input: string): DetectedEntities {
  const lower = input.toLowerCase()

  const dates = matchAll(input, [...RELATIVE_DATES, ...WEEKDAYS, ...MONTHS])
  // ISO dates, slash dates, and "in N days/weeks/months".
  if (/\b\d{4}-\d{2}-\d{2}\b/.test(input)) dates.push('iso-date')
  if (/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/.test(input)) dates.push('numeric-date')
  if (/\bin \d+ (day|days|week|weeks|month|months|year|years)\b/.test(lower))
    dates.push('relative-offset')

  const times = matchAll(input, NAMED_TIMES)
  if (/\b\d{1,2}\s?(am|pm)\b/i.test(input)) times.push('clock-12h')
  if (/\b\d{1,2}:\d{2}\b/.test(input)) times.push('clock-24h')

  const priorities = matchAll(input, PRIORITY_TERMS)

  // Names: capitalised tokens that aren't the first word and aren't a known
  // calendar/common word. Catches "John", "Sarah", "Spain" etc.
  const names: string[] = []
  const tokens = input.match(/[A-Za-z][A-Za-z'-]*/g) ?? []
  tokens.forEach((token, index) => {
    if (index === 0) return
    if (!/^[A-Z][a-z'-]+$/.test(token)) return
    if (NON_NAME_WORDS.has(token.toLowerCase())) return
    names.push(token)
  })

  return {
    dates: uniq(dates),
    times: uniq(times),
    names: uniq(names),
    priorities: uniq(priorities),
  }
}

function entityCount(entities: DetectedEntities): number {
  return (
    entities.dates.length +
    entities.times.length +
    entities.names.length +
    entities.priorities.length
  )
}

// ---------------------------------------------------------------------------
// Input complexity
// ---------------------------------------------------------------------------

const AMBIGUOUS_TERMS = [
  'maybe',
  'perhaps',
  'possibly',
  'probably',
  'might',
  'something',
  'somehow',
  'somewhere',
  'someone',
  'stuff',
  'thing',
  'things',
  'whatever',
  'kinda',
  'kind of',
  'sort of',
  'i guess',
  'not sure',
  'idk',
  'dunno',
  'etc',
]

const CLAUSE_SPLIT =
  /[,;]|\b(?:and|or|then|but|because|while|after|before|although|so that)\b/i

/**
 * Estimates structural complexity: how many words, how many clauses, and how
 * many vague/ambiguous terms the input contains.
 */
function estimateInputComplexity(input: string): InputComplexity {
  const trimmed = input.trim()
  const wordCount = trimmed.length
    ? trimmed.split(/\s+/).filter(Boolean).length
    : 0

  const clauses = trimmed
    .split(CLAUSE_SPLIT)
    .map((c) => c.trim())
    .filter(Boolean)
  const clauseCount = Math.max(1, clauses.length)

  const ambiguousTerms = matchAll(trimmed, AMBIGUOUS_TERMS)

  return { wordCount, clauseCount, ambiguousTerms }
}

// ---------------------------------------------------------------------------
// Complexity score
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

interface ScoreSignals {
  intent?: Intent
  entities?: DetectedEntities
  complexity?: InputComplexity
}

/**
 * Combines the intent base cost, entity richness, length, clause count and
 * ambiguity into a single 0-100 complexity score. Higher means "needs the LLM".
 * When no intent is supplied we assume `create_goal` (the free-form
 * fall-through), matching production behaviour for unrecognised input.
 */
function calculateComplexityScore(
  input: string,
  signals: ScoreSignals = {}
): number {
  const entities = signals.entities ?? detectEntities(input)
  const complexity = signals.complexity ?? estimateInputComplexity(input)
  const intent = signals.intent ?? 'create_goal'

  let score = INTENT_COMPLEXITY[intent]
  score += clamp((complexity.wordCount - 3) * 2, 0, 20)
  score += clamp((complexity.clauseCount - 1) * 8, 0, 24)
  score += Math.min(complexity.ambiguousTerms.length * 6, 18)
  score += Math.min(entityCount(entities) * 7, 28)

  return clamp(Math.round(score), 0, 100)
}

// ---------------------------------------------------------------------------
// Quick patterns
// ---------------------------------------------------------------------------

const NAV_KEYWORDS: Record<string, string> = {
  schedule: '/schedule',
  calendar: '/schedule',
  graph: '/graph',
  timeline: '/timeline',
  history: '/timeline',
  events: '/timeline',
  dashboard: '/',
  home: '/',
}

function extractNavPage(lower: string): string | null {
  for (const [keyword, page] of Object.entries(NAV_KEYWORDS)) {
    if (lower.includes(keyword)) return page
  }
  return null
}

/**
 * High-confidence regex shortcuts. A hit gives both an intent guess and a
 * confidence used by the router. Returns null when nothing matches, in which
 * case the input is treated as free-form `create_goal` text.
 */
function detectQuickPatterns(input: string): QuickPattern | null {
  const lower = input.trim().toLowerCase()

  if (
    /^(help|commands?)\b/.test(lower) ||
    /\b(what can you do|what can i (say|do)|how does this (work|app work)|list (the )?commands)\b/.test(
      lower
    )
  ) {
    return { intent: 'help', confidence: 0.95 }
  }

  if (
    /\b(go to|open|navigate to|take me to|show( me)?( the)?|jump to)\b/.test(
      lower
    )
  ) {
    const page = extractNavPage(lower)
    if (page) return { intent: 'navigate', confidence: 0.9, page }
  }

  if (
    /\b(all (of )?my goals|review all|overview of (my )?goals|summari[sz]e (my )?goals|list (all )?(my )?goals)\b/.test(
      lower
    )
  ) {
    return { intent: 'review_all', confidence: 0.85 }
  }

  if (
    /\bwhat should i (work on|do|focus on|prioriti[sz]e|tackle)\b/.test(
      lower
    ) ||
    /\b(next (action|step|steps)|what'?s next|prioriti[sz]e my)\b/.test(lower)
  ) {
    return { intent: 'work_on', confidence: 0.75 }
  }

  if (
    /\b(what(?:'s| is)? on my (calendar|schedule)|upcoming events|what (meetings|events) do i have|events (this|next) week)\b/.test(
      lower
    )
  ) {
    return { intent: 'schedule_query', confidence: 0.65 }
  }

  if (
    /\b(how('?s| is| are)|status of|progress (on|of)|how am i doing)\b/.test(
      lower
    )
  ) {
    return { intent: 'progress', confidence: 0.7 }
  }

  return null
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

/**
 * Main entry point: decides whether the input should be handled by the offline
 * embedding model (`embeddings`) or escalated to the cloud LLM (`llm`).
 *
 * Decision flow:
 *  1. score >= COMPLEX_MIN          -> llm (too rich for offline)
 *  2. score <= SIMPLE_MAX           -> embeddings (cheap, well-understood)
 *  3. ambiguous middle band         -> trust offline only if the quick pattern
 *                                      confidence clears AMBIGUOUS, else llm
 */
function classifyWithComplexityRouting(input: string): RoutingResult {
  const entities = detectEntities(input)
  const complexity = estimateInputComplexity(input)
  const quick = detectQuickPatterns(input)
  const intent: Intent = quick?.intent ?? 'create_goal'
  const confidence = quick?.confidence ?? 0
  const score = calculateComplexityScore(input, {
    intent,
    entities,
    complexity,
  })

  let route: Route
  if (score >= COMPLEXITY_THRESHOLDS.COMPLEX_MIN) {
    route = 'llm'
  } else if (score <= COMPLEXITY_THRESHOLDS.SIMPLE_MAX) {
    route = 'embeddings'
  } else {
    route = confidence >= CONFIDENCE_THRESHOLDS.AMBIGUOUS ? 'embeddings' : 'llm'
  }

  return {
    route,
    intent,
    score,
    confidence,
    usedQuickPattern: quick !== null,
    entities,
    complexity,
    ...(quick?.page ? { page: quick.page } : {}),
  }
}

// ===========================================================================
// Tests
// ===========================================================================

describe('INTENT_COMPLEXITY', () => {
  it('orders intents from cheap navigation/help to costly goal creation', () => {
    expect(INTENT_COMPLEXITY.help).toBeLessThan(INTENT_COMPLEXITY.navigate + 1)
    expect(INTENT_COMPLEXITY.navigate).toBeLessThan(
      INTENT_COMPLEXITY.review_all
    )
    expect(INTENT_COMPLEXITY.review_all).toBeLessThan(
      INTENT_COMPLEXITY.schedule_query
    )
    expect(INTENT_COMPLEXITY.work_on).toBeLessThan(
      INTENT_COMPLEXITY.create_goal
    )
    expect(INTENT_COMPLEXITY.create_goal).toBe(
      Math.max(...Object.values(INTENT_COMPLEXITY))
    )
  })

  it('keeps every score within 0-100', () => {
    for (const value of Object.values(INTENT_COMPLEXITY)) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(100)
    }
  })
})

describe('CONFIDENCE_THRESHOLDS', () => {
  it('exposes the tiered thresholds', () => {
    expect(CONFIDENCE_THRESHOLDS.SIMPLE).toBe(0.75)
    expect(CONFIDENCE_THRESHOLDS.AMBIGUOUS).toBe(0.5)
    expect(CONFIDENCE_THRESHOLDS.FALLBACK).toBe(0.5)
  })

  it('keeps SIMPLE strictly above the ambiguous/fallback floor', () => {
    expect(CONFIDENCE_THRESHOLDS.SIMPLE).toBeGreaterThan(
      CONFIDENCE_THRESHOLDS.AMBIGUOUS
    )
    expect(CONFIDENCE_THRESHOLDS.AMBIGUOUS).toBe(CONFIDENCE_THRESHOLDS.FALLBACK)
  })
})

describe('detectEntities', () => {
  it('detects relative dates, weekdays and months', () => {
    expect(detectEntities('finish the report by tomorrow').dates).toContain(
      'tomorrow'
    )
    expect(detectEntities('ship it on friday').dates).toContain('friday')
    expect(detectEntities('save money for a trip in december').dates).toContain(
      'december'
    )
  })

  it('detects ISO, numeric and offset dates', () => {
    expect(detectEntities('deadline is 2026-12-01').dates).toContain('iso-date')
    expect(detectEntities('due 12/01 next cycle').dates).toContain(
      'numeric-date'
    )
    expect(detectEntities('review in 3 weeks').dates).toContain(
      'relative-offset'
    )
  })

  it('detects clock and named times', () => {
    expect(detectEntities('meet at 3pm').times).toContain('clock-12h')
    expect(detectEntities('call at 15:30').times).toContain('clock-24h')
    expect(detectEntities('let us sync at noon').times).toContain('noon')
  })

  it('detects person names while ignoring calendar words', () => {
    const entities = detectEntities('schedule a call with John on Monday')
    expect(entities.names).toContain('John')
    expect(entities.names).not.toContain('Monday')
  })

  it('does not treat the first capitalised word as a name', () => {
    expect(detectEntities('Sarah will join later').names).not.toContain('Sarah')
    expect(detectEntities('remind me about Sarah').names).toContain('Sarah')
  })

  it('detects priority markers', () => {
    expect(detectEntities('this is urgent').priorities).toContain('urgent')
    expect(detectEntities('do it asap please').priorities).toContain('asap')
    expect(detectEntities('this is high priority for me').priorities).toContain(
      'high priority'
    )
  })

  it('returns empty arrays when nothing matches', () => {
    expect(detectEntities('open the graph')).toEqual({
      dates: [],
      times: [],
      names: [],
      priorities: [],
    })
  })
})

describe('estimateInputComplexity', () => {
  it('counts words', () => {
    expect(estimateInputComplexity('what should I do').wordCount).toBe(4)
    expect(estimateInputComplexity('   ').wordCount).toBe(0)
  })

  it('counts clauses split on punctuation and conjunctions', () => {
    expect(estimateInputComplexity('help').clauseCount).toBe(1)
    expect(
      estimateInputComplexity('learn spanish and save money').clauseCount
    ).toBe(2)
    expect(
      estimateInputComplexity(
        'plan the trip, book flights, and reserve a hotel'
      ).clauseCount
    ).toBe(3)
  })

  it('detects ambiguous terms', () => {
    const result = estimateInputComplexity('maybe do something about that')
    expect(result.ambiguousTerms).toContain('maybe')
    expect(result.ambiguousTerms).toContain('something')
  })
})

describe('calculateComplexityScore', () => {
  it('returns a low score for a short, simple navigation request', () => {
    const score = calculateComplexityScore('open the graph', {
      intent: 'navigate',
    })
    expect(score).toBeLessThanOrEqual(COMPLEXITY_THRESHOLDS.SIMPLE_MAX)
  })

  it('returns a high score for entity-rich goal creation', () => {
    const input =
      'save $5000 for a trip to Spain by December and book flights with Sarah, it is urgent'
    const score = calculateComplexityScore(input, { intent: 'create_goal' })
    expect(score).toBeGreaterThanOrEqual(COMPLEXITY_THRESHOLDS.COMPLEX_MIN)
  })

  it('rises monotonically as signals are added', () => {
    const base = calculateComplexityScore('learn spanish', {
      intent: 'create_goal',
    })
    const withDate = calculateComplexityScore('learn spanish by december', {
      intent: 'create_goal',
    })
    const withDateAndClause = calculateComplexityScore(
      'learn spanish by december and practice with Maria every morning',
      { intent: 'create_goal' }
    )
    expect(withDate).toBeGreaterThanOrEqual(base)
    expect(withDateAndClause).toBeGreaterThanOrEqual(withDate)
  })

  it('defaults to create_goal complexity when no intent is given', () => {
    const explicit = calculateComplexityScore('learn spanish', {
      intent: 'create_goal',
    })
    const implicit = calculateComplexityScore('learn spanish')
    expect(implicit).toBe(explicit)
  })

  it('clamps to the 0-100 range', () => {
    const huge =
      'urgent critical asap save money buy a house in december, call John and Sarah and Maria, then maybe do something else and probably more stuff because reasons'
    expect(calculateComplexityScore(huge)).toBeLessThanOrEqual(100)
    expect(
      calculateComplexityScore('hi', { intent: 'help' })
    ).toBeGreaterThanOrEqual(0)
  })
})

describe('detectQuickPatterns', () => {
  it('matches help with high confidence', () => {
    const result = detectQuickPatterns('what can you do')
    expect(result?.intent).toBe('help')
    expect(result?.confidence).toBeGreaterThanOrEqual(
      CONFIDENCE_THRESHOLDS.SIMPLE
    )
  })

  it('matches navigation and extracts the target page', () => {
    expect(detectQuickPatterns('go to the schedule')).toMatchObject({
      intent: 'navigate',
      page: '/schedule',
    })
    expect(detectQuickPatterns('open the graph')?.page).toBe('/graph')
    expect(detectQuickPatterns('show me the timeline')?.page).toBe('/timeline')
  })

  it('does not classify as navigate without a known page keyword', () => {
    expect(detectQuickPatterns('go to the moon')).toBeNull()
  })

  it('matches review_all phrasings', () => {
    expect(detectQuickPatterns('show me all my goals')?.intent).toBe(
      'review_all'
    )
    expect(detectQuickPatterns('review all my goals')?.intent).toBe(
      'review_all'
    )
    expect(detectQuickPatterns('list my goals')?.intent).toBe('review_all')
  })

  it('distinguishes work_on from help', () => {
    expect(detectQuickPatterns('what should I work on next')?.intent).toBe(
      'work_on'
    )
    expect(detectQuickPatterns('what can you do')?.intent).toBe('help')
  })

  it('matches schedule and progress queries with medium confidence', () => {
    const schedule = detectQuickPatterns('what is on my calendar')
    expect(schedule?.intent).toBe('schedule_query')
    expect(schedule?.confidence).toBeLessThan(CONFIDENCE_THRESHOLDS.SIMPLE)

    const progress = detectQuickPatterns('how is my fitness goal going')
    expect(progress?.intent).toBe('progress')
    expect(progress?.confidence).toBeGreaterThanOrEqual(
      CONFIDENCE_THRESHOLDS.AMBIGUOUS
    )
  })

  it('returns null for free-form goal text', () => {
    expect(detectQuickPatterns('I want to learn to play the guitar')).toBeNull()
  })
})

describe('classifyWithComplexityRouting', () => {
  describe('simple queries route to embeddings', () => {
    it.each([
      ['help', 'help'],
      ['what can you do', 'help'],
      ['go to the schedule', 'navigate'],
      ['open the graph', 'navigate'],
      ['show me all my goals', 'review_all'],
      ['review all my goals', 'review_all'],
    ])('%s -> embeddings (%s)', (input, intent) => {
      const result = classifyWithComplexityRouting(input)
      expect(result.route).toBe('embeddings')
      expect(result.intent).toBe(intent)
      expect(result.score).toBeLessThanOrEqual(COMPLEXITY_THRESHOLDS.SIMPLE_MAX)
    })

    it('attaches the resolved page for navigation', () => {
      expect(classifyWithComplexityRouting('go to the timeline').page).toBe(
        '/timeline'
      )
    })
  })

  describe('medium complexity queries route based on confidence/score', () => {
    it('routes a short progress query to embeddings', () => {
      const result = classifyWithComplexityRouting('how is my goal going')
      expect(result.intent).toBe('progress')
      expect(result.route).toBe('embeddings')
    })

    it('routes a short work_on query to embeddings', () => {
      const result = classifyWithComplexityRouting('what should I work on')
      expect(result.intent).toBe('work_on')
      expect(result.route).toBe('embeddings')
    })

    it('escalates an entity-rich schedule query to the llm', () => {
      const result = classifyWithComplexityRouting(
        'what meetings do I have tomorrow at 3pm with John about the urgent budget review'
      )
      expect(result.intent).toBe('schedule_query')
      expect(result.score).toBeGreaterThanOrEqual(
        COMPLEXITY_THRESHOLDS.COMPLEX_MIN
      )
      expect(result.route).toBe('llm')
    })

    it('escalates a multi-clause progress query to the llm', () => {
      const result = classifyWithComplexityRouting(
        'how is my goal going, and what about the budget, because I am worried about the timeline'
      )
      expect(result.intent).toBe('progress')
      expect(result.route).toBe('llm')
    })
  })

  describe('complex goal creation routes to the llm', () => {
    it.each([
      'save $5000 for a trip to Spain by December and book flights with Sarah, it is urgent',
      'I want to learn spanish fluently before my move to Madrid next year',
      'launch the side project by friday, then find three beta users asap',
    ])('%s -> llm', (input) => {
      const result = classifyWithComplexityRouting(input)
      expect(result.intent).toBe('create_goal')
      expect(result.route).toBe('llm')
      expect(result.usedQuickPattern).toBe(false)
    })

    it('counts the structured entities it found', () => {
      const result = classifyWithComplexityRouting(
        'save money for a trip to Spain by December with Sarah, it is urgent'
      )
      expect(result.entities.dates).toContain('december')
      expect(result.entities.names).toContain('Sarah')
      expect(result.entities.priorities).toContain('urgent')
    })
  })

  describe('edge cases', () => {
    it('routes vague, low-confidence input to the llm', () => {
      const result = classifyWithComplexityRouting(
        'maybe do something about that thing somehow'
      )
      expect(result.usedQuickPattern).toBe(false)
      expect(result.complexity.ambiguousTerms.length).toBeGreaterThan(0)
      expect(result.route).toBe('llm')
    })

    it('keeps a trivial navigation request cheap despite extra words', () => {
      const result = classifyWithComplexityRouting(
        'please take me to the schedule page right now'
      )
      expect(result.intent).toBe('navigate')
      expect(result.route).toBe('embeddings')
    })

    it('always returns a score within 0-100', () => {
      for (const input of [
        '',
        'hi',
        'help',
        'save $5000 for a trip to Spain by December with John and Sarah asap',
      ]) {
        const { score } = classifyWithComplexityRouting(input)
        expect(score).toBeGreaterThanOrEqual(0)
        expect(score).toBeLessThanOrEqual(100)
      }
    })

    it('falls back to create_goal for empty input', () => {
      const result = classifyWithComplexityRouting('')
      expect(result.intent).toBe('create_goal')
      expect(result.usedQuickPattern).toBe(false)
    })
  })
})
