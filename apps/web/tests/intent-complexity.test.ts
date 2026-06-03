import { describe, expect, it } from 'vitest'
import {
  COMPLEXITY_THRESHOLDS,
  CONFIDENCE_THRESHOLDS,
  calculateComplexityScore,
  classifyWithComplexityRouting,
  detectEntities,
  detectQuickPatterns,
  estimateInputComplexity,
  INTENT_COMPLEXITY,
  type Route,
  SAMPLE_DATASET,
} from './intent-complexity'

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

  it('matches schedule_event phrasings before schedule_query', () => {
    expect(detectQuickPatterns('schedule a meeting')?.intent).toBe(
      'schedule_event'
    )
    expect(detectQuickPatterns('book a call with John tomorrow')?.intent).toBe(
      'schedule_event'
    )
    expect(detectQuickPatterns('add a reminder to my calendar')?.intent).toBe(
      'schedule_event'
    )
    expect(detectQuickPatterns('create a calendar event')?.intent).toBe(
      'schedule_event'
    )
    // Still distinct from a read-only calendar query.
    expect(detectQuickPatterns('what is on my calendar')?.intent).toBe(
      'schedule_query'
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

  describe('schedule_event routing', () => {
    it('routes a bare scheduling command to embeddings', () => {
      const result = classifyWithComplexityRouting('schedule a meeting')
      expect(result.intent).toBe('schedule_event')
      expect(result.route).toBe('embeddings')
    })

    it('escalates an entity-rich scheduling command to the llm', () => {
      const result = classifyWithComplexityRouting(
        'schedule a meeting with John tomorrow at 3pm about the budget'
      )
      expect(result.intent).toBe('schedule_event')
      expect(result.score).toBeGreaterThanOrEqual(
        COMPLEXITY_THRESHOLDS.COMPLEX_MIN
      )
      expect(result.route).toBe('llm')
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

const DATASET = SAMPLE_DATASET

describe('large labeled dataset', () => {
  it('contains a sizeable corpus', () => {
    expect(DATASET.length).toBeGreaterThanOrEqual(150)
  })

  it('has no duplicate inputs', () => {
    const inputs = DATASET.map((c) => c.input)
    expect(new Set(inputs).size).toBe(inputs.length)
  })

  it.each(DATASET)('routes "$input" to $route as $intent', ({
    input,
    intent,
    route,
    page,
  }) => {
    const result = classifyWithComplexityRouting(input)
    expect(result.intent).toBe(intent)
    expect(result.route).toBe(route)
    if (page) expect(result.page).toBe(page)
  })

  it('keeps every score within 0-100 and never throws', () => {
    for (const { input } of DATASET) {
      const result = classifyWithComplexityRouting(input)
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    }
  })

  it('routes all simple intents to embeddings', () => {
    const simple = DATASET.filter((c) =>
      ['navigate', 'help', 'review_all'].includes(c.intent)
    )
    expect(simple.length).toBeGreaterThan(0)
    for (const c of simple) {
      expect(classifyWithComplexityRouting(c.input).route).toBe('embeddings')
    }
  })

  it('routes all create_goal inputs to the llm', () => {
    const goals = DATASET.filter((c) => c.intent === 'create_goal')
    expect(goals.length).toBeGreaterThan(0)
    for (const c of goals) {
      expect(classifyWithComplexityRouting(c.input).route).toBe('llm')
    }
  })

  it('produces a sane route distribution (both routes well represented)', () => {
    const counts = DATASET.reduce(
      (acc, c) => {
        const route = classifyWithComplexityRouting(c.input).route
        acc[route] += 1
        return acc
      },
      { embeddings: 0, llm: 0 } as Record<Route, number>
    )
    expect(counts.embeddings).toBeGreaterThan(20)
    expect(counts.llm).toBeGreaterThan(20)
    expect(counts.embeddings + counts.llm).toBe(DATASET.length)
  })
})
