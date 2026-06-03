/**
 * Standalone complexity-based intent routing.
 *
 * This module deliberately re-implements the heuristics in isolation (rather
 * than importing from `src/lib/semantic`) so the routing logic can be tuned and
 * verified without touching production code. The idea: cheap requests
 * (navigation, help, "show all my goals") should be answered by the on-device
 * embedding model, while genuinely complex, entity-rich free text (e.g. "save
 * $5000 for a trip to Spain by December") should be routed to the cloud LLM.
 *
 * It is consumed by `intent-complexity.test.ts` (the test suite) and by
 * `intent-complexity.cli.ts` (an interactive playground). It is intentionally
 * NOT a `*.test.ts` file, so Vitest does not execute it directly.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SemanticIntent =
  | 'review_all'
  | 'progress'
  | 'work_on'
  | 'navigate'
  | 'schedule_query'
  | 'help'

/** `create_goal` is the free-form fall-through, same as the production API. */
export type Intent = SemanticIntent | 'create_goal'

/** Where a given input should be classified. */
export type Route = 'embeddings' | 'llm'

export interface DetectedEntities {
  dates: string[]
  times: string[]
  names: string[]
  priorities: string[]
}

export interface InputComplexity {
  wordCount: number
  clauseCount: number
  ambiguousTerms: string[]
}

export interface QuickPattern {
  intent: Intent
  confidence: number
  page?: string
}

export interface RoutingResult {
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
export const INTENT_COMPLEXITY: Record<Intent, number> = {
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
export const CONFIDENCE_THRESHOLDS = {
  SIMPLE: 0.75,
  AMBIGUOUS: 0.5,
  FALLBACK: 0.5,
} as const

/** Complexity-score (0-100) cut points used by the router. */
export const COMPLEXITY_THRESHOLDS = {
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
export function detectEntities(input: string): DetectedEntities {
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
export function estimateInputComplexity(input: string): InputComplexity {
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

export interface ScoreSignals {
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
export function calculateComplexityScore(
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
export function detectQuickPatterns(input: string): QuickPattern | null {
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
    /\b(what(?:'?s| is)? on my (calendar|schedule)|upcoming events|what (meetings|events) do i have|events (this|next) week)\b/.test(
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
export function classifyWithComplexityRouting(input: string): RoutingResult {
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
// Large labeled dataset
//
// A broad, mostly template-generated corpus of (input, expected intent,
// expected route) tuples used to exercise the router at volume and to make
// tuning regressions obvious. Generators keep each category internally
// consistent so a single threshold change surfaces as many failing rows.
// ===========================================================================

export interface RoutingCase {
  input: string
  intent: Intent
  route: Route
  page?: string
}

// --- Navigation: templates x known pages (all cheap -> embeddings) ----------
const NAV_TEMPLATES = [
  'go to the',
  'open the',
  'navigate to the',
  'take me to the',
  'show me the',
  'jump to the',
]

const NAV_PAGES: Array<[string, string]> = [
  ['schedule', '/schedule'],
  ['calendar', '/schedule'],
  ['graph', '/graph'],
  ['timeline', '/timeline'],
  ['history', '/timeline'],
  ['events', '/timeline'],
  ['dashboard', '/'],
  ['home', '/'],
]

const navigationCases: RoutingCase[] = NAV_TEMPLATES.flatMap((template) =>
  NAV_PAGES.map(([keyword, page]) => ({
    input: `${template} ${keyword}`,
    intent: 'navigate' as const,
    route: 'embeddings' as const,
    page,
  }))
)

// --- Help (all cheap -> embeddings) -----------------------------------------
const helpCases: RoutingCase[] = [
  'help',
  'help me',
  'what can you do',
  'what can i say',
  'what can i do',
  'list the commands',
  'list commands',
  'how does this work',
  'commands',
].map((input) => ({ input, intent: 'help', route: 'embeddings' }))

// --- Review all (all cheap -> embeddings) -----------------------------------
const reviewAllCases: RoutingCase[] = [
  'show me all my goals',
  'review all my goals',
  'list my goals',
  'list all my goals',
  'all my goals',
  'give me an overview of my goals',
  'overview of my goals',
  'summarize my goals',
  'summarise my goals',
  'review all',
  'see all my goals',
].map((input) => ({ input, intent: 'review_all', route: 'embeddings' }))

// --- Progress: short, topic-templated (medium -> embeddings) ----------------
const PROGRESS_TOPICS = [
  'goal',
  'project',
  'fitness goal',
  'spanish learning',
  'reading habit',
  'side project',
  'savings plan',
  'marathon training',
  'meditation practice',
  'writing project',
]

const progressCases: RoutingCase[] = [
  ...PROGRESS_TOPICS.map((topic) => ({
    input: `how is my ${topic} going`,
    intent: 'progress' as const,
    route: 'embeddings' as const,
  })),
  ...[
    'how am i doing',
    'status of my project',
    'progress on my fitness goal',
    'progress of my plan',
    'how are my goals progressing',
  ].map((input) => ({
    input,
    intent: 'progress' as const,
    route: 'embeddings' as const,
  })),
]

// --- Work on: short (medium -> embeddings) ----------------------------------
const WORK_ON_SUFFIXES = ['', 'next', 'first', 'right now', 'now']

const workOnCases: RoutingCase[] = [
  ...WORK_ON_SUFFIXES.map((suffix) => ({
    input: `what should i work on ${suffix}`.trim(),
    intent: 'work_on' as const,
    route: 'embeddings' as const,
  })),
  ...[
    'what should i do',
    'what should i focus on',
    'what is my next action',
    'what are my next steps',
    'what should i prioritize',
    'prioritize my tasks',
    'what should i tackle first',
  ].map((input) => ({
    input,
    intent: 'work_on' as const,
    route: 'embeddings' as const,
  })),
]

// --- Schedule query: short (medium -> embeddings) ---------------------------
const scheduleCases: RoutingCase[] = [
  'what is on my calendar',
  'whats on my calendar',
  'what is on my schedule',
  'whats on my schedule',
  'my upcoming events',
  'upcoming events',
  'what meetings do i have',
  'what events do i have',
  'events this week',
  'events next week',
].map((input) => ({ input, intent: 'schedule_query', route: 'embeddings' }))

// --- Create goal: verbs x objects + explicit (all -> llm) -------------------
const GOAL_VERBS = [
  'learn',
  'master',
  'build',
  'start',
  'finish',
  'launch',
  'write',
  'save for',
  'plan',
]

const GOAL_OBJECTS = [
  'a new language',
  'my side project',
  'a marathon plan',
  'a budget',
  'a book',
  'a morning routine',
  'a fitness habit',
  'a business plan',
]

const createGoalCases: RoutingCase[] = [
  ...GOAL_VERBS.flatMap((verb) =>
    GOAL_OBJECTS.map((object) => ({
      input: `${verb} ${object}`,
      intent: 'create_goal' as const,
      route: 'llm' as const,
    }))
  ),
  ...[
    'learn to play guitar',
    'run a marathon',
    'save money for a house',
    'read more books this year',
    'start exercising every morning',
    'learn spanish by december',
    'save $5000 for a trip to Spain by December',
    'launch the side project by friday and find beta users',
    'i want to learn spanish fluently before my move to Madrid next year',
    'lose ten pounds before the wedding in june',
  ].map((input) => ({
    input,
    intent: 'create_goal' as const,
    route: 'llm' as const,
  })),
]

// --- Entity-rich medium queries that should escalate (-> llm) ---------------
const mediumEscalationCases: RoutingCase[] = [
  {
    input:
      'what meetings do i have tomorrow at 3pm with John about the urgent budget review',
    intent: 'schedule_query',
    route: 'llm',
  },
  {
    input:
      'how is my goal going, and what about the budget, because i am worried about the timeline next week',
    intent: 'progress',
    route: 'llm',
  },
  {
    input:
      'what should i do given the deadline on friday, the urgent review, and my meeting with Sarah',
    intent: 'work_on',
    route: 'llm',
  },
]

// --- Vague / low-confidence input (no pattern -> llm) -----------------------
const ambiguousCases: RoutingCase[] = [
  'maybe do something',
  'i guess work on stuff',
  'not sure what to do',
  'perhaps something later',
  'idk maybe later',
].map((input) => ({ input, intent: 'create_goal', route: 'llm' }))

export const SAMPLE_DATASET: RoutingCase[] = [
  ...navigationCases,
  ...helpCases,
  ...reviewAllCases,
  ...progressCases,
  ...workOnCases,
  ...scheduleCases,
  ...createGoalCases,
  ...mediumEscalationCases,
  ...ambiguousCases,
]
