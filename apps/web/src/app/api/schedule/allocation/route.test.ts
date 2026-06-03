import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'

// ── Auth mock ───────────────────────────────────────────────────
vi.mock('@/lib/server/auth', () => ({
  requireAuthUserId: vi.fn().mockResolvedValue('test-user-id'),
}))

// ── Prisma mock ──────────────────────────────────────────────────
vi.mock('@goalos/shared/lib/prisma', () => ({
  prisma: {
    scheduleEvent: { findMany: vi.fn(), count: vi.fn() },
    goal: { findMany: vi.fn() },
    action: { findMany: vi.fn() },
  },
}))

import { prisma } from '@goalos/shared/lib/prisma'

const mockEventFindMany = vi.mocked(prisma.scheduleEvent.findMany)
const mockEventCount = vi.mocked(prisma.scheduleEvent.count)
const mockGoalFindMany = vi.mocked(prisma.goal.findMany)
const mockActionFindMany = vi.mocked(prisma.action.findMany)

// ── Helpers ──────────────────────────────────────────────────────

function makeRequest(period?: string) {
  const url = period
    ? `http://localhost/api/schedule/allocation?period=${period}`
    : 'http://localhost/api/schedule/allocation'
  return new Request(url)
}

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    title: 'Work',
    description: null,
    startTime: new Date('2025-06-01T09:00:00Z'),
    endTime: new Date('2025-06-01T11:00:00Z'),
    allDay: false,
    location: null,
    source: 'GOALOS',
    externalId: null,
    externalCalendarId: null,
    goalId: null,
    actionId: null,
    calendarConnectionId: null,
    color: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

const VALUE_A = {
  id: 'value-a',
  label: 'Career Growth',
  rank: 1,
}
const VALUE_B = {
  id: 'value-b',
  label: 'Health & Fitness',
  rank: 2,
}

function makeGoal(
  id: string,
  value: { id: string; label: string; rank: number } | null
) {
  return {
    id,
    valueId: value?.id ?? null,
    value,
  }
}

// ── Setup ────────────────────────────────────────────────────────

let realDate: typeof Date

beforeEach(() => {
  vi.clearAllMocks()

  // Pin "now" to 2025-06-15T12:00:00Z (a Sunday in US locale, but the
  // important thing is the date math is deterministic).
  realDate = globalThis.Date
  const FIXED_NOW = new Date('2025-06-15T12:00:00Z')
  vi.useFakeTimers()
  vi.setSystemTime(FIXED_NOW)

  // Default: no events, no goals. eventCount > 0 prevents the onboarding
  // fallback from running in tests that don't explicitly test it.
  mockEventFindMany.mockResolvedValue([])
  mockEventCount.mockResolvedValue(1)
  mockGoalFindMany.mockResolvedValue([])
  mockActionFindMany.mockResolvedValue([])
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

// ── Tests ────────────────────────────────────────────────────────

describe('GET /api/schedule/allocation', () => {
  // ─── Period defaults ───────────────────────────────────────────

  it('defaults to "week" when no period param is given', async () => {
    const res = await GET(makeRequest())
    const body = await res.json()
    expect(body.period).toBe('week')
  })

  it('accepts all four period values', async () => {
    for (const p of ['day', 'week', 'month', 'all']) {
      const res = await GET(makeRequest(p))
      const body = await res.json()
      expect(body.period).toBe(p)
    }
  })

  // ─── Day period ────────────────────────────────────────────────

  describe('day period', () => {
    it('sets daysInPeriod to 1', async () => {
      const res = await GET(makeRequest('day'))
      const body = await res.json()
      expect(body.daysInPeriod).toBe(1)
    })

    it('queries events only within the current day', async () => {
      await GET(makeRequest('day'))

      const where = mockEventFindMany.mock.calls[0]?.[0]?.where
      const startFilter = where?.startTime as { gte: Date; lt: Date }

      // start = midnight on 2025-06-15
      expect(startFilter.gte.getFullYear()).toBe(2025)
      expect(startFilter.gte.getMonth()).toBe(5) // 0-indexed June
      expect(startFilter.gte.getDate()).toBe(15)

      // end = midnight on 2025-06-16 (exactly 24h later)
      expect(startFilter.lt.getTime() - startFilter.gte.getTime()).toBe(
        24 * 60 * 60 * 1000
      )
    })

    it('calculates correct totalMinutes from events in the day', async () => {
      const goalId = 'goal-1'
      mockGoalFindMany.mockResolvedValue([makeGoal(goalId, VALUE_A)] as never)

      // 2-hour event
      mockEventFindMany.mockResolvedValue([
        makeEvent({
          startTime: new Date('2025-06-15T09:00:00Z'),
          endTime: new Date('2025-06-15T11:00:00Z'),
          goalId,
        }),
      ] as never)

      const res = await GET(makeRequest('day'))
      const body = await res.json()

      expect(body.totalMinutes).toBe(120)
      expect(body.avgMinutesPerDay).toBe(120) // 120 / 1 day
      expect(body.allocations).toHaveLength(1)
      expect(body.allocations[0].valueLabel).toBe('Career Growth')
      // 120 min / 1440 min (24h day capacity) = 8%
      expect(body.allocations[0].percentage).toBe(8)
    })
  })

  // ─── Week period ───────────────────────────────────────────────

  describe('week period', () => {
    it('sets daysInPeriod to 7', async () => {
      const res = await GET(makeRequest('week'))
      const body = await res.json()
      expect(body.daysInPeriod).toBe(7)
    })

    it('queries events within the 7-day week window', async () => {
      await GET(makeRequest('week'))

      const where = mockEventFindMany.mock.calls[0]?.[0]?.where
      const startFilter = where?.startTime as { gte: Date; lt: Date }

      // 2025-06-15 is a Sunday, so week start should be Sunday (getDay() === 0)
      expect(startFilter.gte.getDay()).toBe(0) // Sunday
      expect(startFilter.lt.getTime() - startFilter.gte.getTime()).toBe(
        7 * 24 * 60 * 60 * 1000
      )
    })

    it('computes avgMinutesPerDay correctly across 7 days', async () => {
      const goalId = 'goal-1'
      mockGoalFindMany.mockResolvedValue([makeGoal(goalId, VALUE_A)] as never)

      // 3.5 hours total
      mockEventFindMany.mockResolvedValue([
        makeEvent({
          startTime: new Date('2025-06-15T09:00:00Z'),
          endTime: new Date('2025-06-15T12:30:00Z'),
          goalId,
        }),
      ] as never)

      const res = await GET(makeRequest('week'))
      const body = await res.json()

      expect(body.totalMinutes).toBe(210)
      expect(body.daysInPeriod).toBe(7)
      expect(body.avgMinutesPerDay).toBe(30) // 210 / 7 = 30
    })
  })

  // ─── Month period ──────────────────────────────────────────────

  describe('month period', () => {
    it('uses full month length for daysInPeriod', async () => {
      // June has 30 days
      const res = await GET(makeRequest('month'))
      const body = await res.json()
      expect(body.daysInPeriod).toBe(30)
    })

    it('queries events from 1st of month to 1st of next month', async () => {
      await GET(makeRequest('month'))

      const where = mockEventFindMany.mock.calls[0]?.[0]?.where
      const startFilter = where?.startTime as { gte: Date; lt: Date }

      // Start: June 1
      expect(startFilter.gte.getMonth()).toBe(5)
      expect(startFilter.gte.getDate()).toBe(1)

      // End: July 1
      expect(startFilter.lt.getMonth()).toBe(6)
      expect(startFilter.lt.getDate()).toBe(1)
    })

    it('computes avgMinutesPerDay over the full month', async () => {
      const goalId = 'goal-1'
      mockGoalFindMany.mockResolvedValue([makeGoal(goalId, VALUE_B)] as never)

      // 15 hours total
      mockEventFindMany.mockResolvedValue([
        makeEvent({
          startTime: new Date('2025-06-10T08:00:00Z'),
          endTime: new Date('2025-06-10T23:00:00Z'),
          goalId,
        }),
      ] as never)

      const res = await GET(makeRequest('month'))
      const body = await res.json()

      expect(body.totalMinutes).toBe(900) // 15h
      expect(body.daysInPeriod).toBe(30) // June
      expect(body.avgMinutesPerDay).toBe(30) // 900 / 30
    })
  })

  // ─── All period ────────────────────────────────────────────────

  describe('all period', () => {
    it('computes daysInPeriod from earliest event to now', async () => {
      const goalId = 'goal-1'
      mockGoalFindMany.mockResolvedValue([makeGoal(goalId, VALUE_A)] as never)

      // Event 10 days ago
      const tenDaysAgo = new Date('2025-06-05T09:00:00Z')
      mockEventFindMany.mockResolvedValue([
        makeEvent({
          startTime: tenDaysAgo,
          endTime: new Date('2025-06-05T11:00:00Z'),
          goalId,
        }),
      ] as never)

      const res = await GET(makeRequest('all'))
      const body = await res.json()

      // (June 15 12:00 - June 5 09:00) / 86400000 ≈ 10.125 → ceil = 11
      expect(body.daysInPeriod).toBeGreaterThanOrEqual(10)
      expect(body.daysInPeriod).toBeLessThanOrEqual(11)
    })

    it('defaults daysInPeriod to 1 when no events exist', async () => {
      const res = await GET(makeRequest('all'))
      const body = await res.json()
      expect(body.daysInPeriod).toBe(1)
    })
  })

  // ─── Allocation aggregation ────────────────────────────────────

  describe('allocation aggregation', () => {
    it('groups events by their goal value', async () => {
      const goalA = 'goal-a'
      const goalB = 'goal-b'
      mockGoalFindMany.mockResolvedValue([
        makeGoal(goalA, VALUE_A),
        makeGoal(goalB, VALUE_B),
      ] as never)

      mockEventFindMany.mockResolvedValue([
        makeEvent({
          startTime: new Date('2025-06-15T09:00:00Z'),
          endTime: new Date('2025-06-15T11:00:00Z'),
          goalId: goalA, // 120 min → Career Growth
        }),
        makeEvent({
          startTime: new Date('2025-06-15T13:00:00Z'),
          endTime: new Date('2025-06-15T14:00:00Z'),
          goalId: goalB, // 60 min → Health & Fitness
        }),
      ] as never)

      const res = await GET(makeRequest('day'))
      const body = await res.json()

      expect(body.allocations).toHaveLength(2)
      expect(body.totalMinutes).toBe(180)

      const career = body.allocations.find(
        (a: { valueLabel: string }) => a.valueLabel === 'Career Growth'
      )
      expect(career.totalMinutes).toBe(120)
      // 120 min / 1440 min (24h day capacity) = 8%
      expect(career.percentage).toBe(8)

      const health = body.allocations.find(
        (a: { valueLabel: string }) => a.valueLabel === 'Health & Fitness'
      )
      expect(health.totalMinutes).toBe(60)
      // 60 min / 1440 min (24h day capacity) = 4%
      expect(health.percentage).toBe(4)
    })

    it('puts events without a goal value in the "Unlinked Events" bucket', async () => {
      mockGoalFindMany.mockResolvedValue([makeGoal('goal-x', null)] as never)

      mockEventFindMany.mockResolvedValue([
        makeEvent({
          startTime: new Date('2025-06-15T09:00:00Z'),
          endTime: new Date('2025-06-15T10:00:00Z'),
          goalId: 'goal-x',
        }),
      ] as never)

      const res = await GET(makeRequest('day'))
      const body = await res.json()

      expect(body.allocations).toHaveLength(1)
      expect(body.allocations[0].valueLabel).toBe('Unlinked Events')
      expect(body.allocations[0].valueId).toBeNull()
    })

    it('puts events with no goalId in the "Unlinked Events" bucket', async () => {
      mockEventFindMany.mockResolvedValue([
        makeEvent({
          startTime: new Date('2025-06-15T09:00:00Z'),
          endTime: new Date('2025-06-15T10:00:00Z'),
          goalId: null,
        }),
      ] as never)

      const res = await GET(makeRequest('day'))
      const body = await res.json()

      expect(body.allocations).toHaveLength(1)
      expect(body.allocations[0].valueLabel).toBe('Unlinked Events')
    })

    it('treats all-day events as 480 minutes (8 hours)', async () => {
      const goalId = 'goal-1'
      mockGoalFindMany.mockResolvedValue([makeGoal(goalId, VALUE_A)] as never)

      mockEventFindMany.mockResolvedValue([
        makeEvent({
          startTime: new Date('2025-06-15T00:00:00Z'),
          endTime: new Date('2025-06-16T00:00:00Z'),
          allDay: true,
          goalId,
        }),
      ] as never)

      const res = await GET(makeRequest('day'))
      const body = await res.json()

      expect(body.totalMinutes).toBe(480)
      expect(body.allocations[0].totalMinutes).toBe(480)
    })

    it('orders allocations by value rank', async () => {
      const goalA = 'goal-a'
      const goalB = 'goal-b'
      // VALUE_B has rank 2, VALUE_A has rank 1
      mockGoalFindMany.mockResolvedValue([
        makeGoal(goalA, VALUE_A),
        makeGoal(goalB, VALUE_B),
      ] as never)

      mockEventFindMany.mockResolvedValue([
        makeEvent({
          startTime: new Date('2025-06-15T09:00:00Z'),
          endTime: new Date('2025-06-15T10:00:00Z'),
          goalId: goalB, // Health rank=2
        }),
        makeEvent({
          startTime: new Date('2025-06-15T10:00:00Z'),
          endTime: new Date('2025-06-15T11:00:00Z'),
          goalId: goalA, // Career rank=1
        }),
      ] as never)

      const res = await GET(makeRequest('day'))
      const body = await res.json()

      expect(body.allocations[0].valueLabel).toBe('Career Growth')
      expect(body.allocations[1].valueLabel).toBe('Health & Fitness')
    })

    it('assigns rotating colors from VALUE_COLORS palette', async () => {
      const goalA = 'goal-a'
      const goalB = 'goal-b'
      mockGoalFindMany.mockResolvedValue([
        makeGoal(goalA, VALUE_A),
        makeGoal(goalB, VALUE_B),
      ] as never)

      mockEventFindMany.mockResolvedValue([
        makeEvent({
          startTime: new Date('2025-06-15T09:00:00Z'),
          endTime: new Date('2025-06-15T10:00:00Z'),
          goalId: goalA,
        }),
        makeEvent({
          startTime: new Date('2025-06-15T10:00:00Z'),
          endTime: new Date('2025-06-15T11:00:00Z'),
          goalId: goalB,
        }),
      ] as never)

      const res = await GET(makeRequest('day'))
      const body = await res.json()

      expect(body.allocations[0].color).toBe('#3b82f6')
      expect(body.allocations[1].color).toBe('#10b981')
    })
  })

  // ─── Onboarding fallback ───────────────────────────────────────

  describe('onboarding fallback (no schedule events globally)', () => {
    it('estimates 60min per open action when zero events exist anywhere', async () => {
      const goalId = 'goal-1'
      mockGoalFindMany.mockResolvedValue([makeGoal(goalId, VALUE_A)] as never)
      mockEventFindMany.mockResolvedValue([])
      mockEventCount.mockResolvedValue(0) // override default to trigger fallback
      mockActionFindMany.mockResolvedValue([{ goalId }, { goalId }] as never)

      const res = await GET(makeRequest('day'))
      const body = await res.json()

      expect(body.totalMinutes).toBe(120) // 2 actions × 60 min
      expect(body.allocations[0].eventCount).toBe(2)
    })

    it('does not use fallback when events exist elsewhere', async () => {
      // No events in day range, but events exist globally
      mockEventFindMany.mockResolvedValue([])
      mockEventCount.mockResolvedValue(5)

      const res = await GET(makeRequest('day'))
      const body = await res.json()

      expect(body.allocations).toHaveLength(0)
      expect(body.totalMinutes).toBe(0)
      expect(mockActionFindMany).not.toHaveBeenCalled()
    })
  })

  // ─── Edge cases ────────────────────────────────────────────────

  describe('edge cases', () => {
    it('returns zero totalMinutes and empty allocations when no events match', async () => {
      mockEventFindMany.mockResolvedValue([])
      mockEventCount.mockResolvedValue(1) // events exist, just not in range

      const res = await GET(makeRequest('day'))
      const body = await res.json()

      expect(body.totalMinutes).toBe(0)
      expect(body.avgMinutesPerDay).toBe(0)
      expect(body.allocations).toEqual([])
    })

    it('handles events with zero duration gracefully', async () => {
      const goalId = 'goal-1'
      mockGoalFindMany.mockResolvedValue([makeGoal(goalId, VALUE_A)] as never)

      mockEventFindMany.mockResolvedValue([
        makeEvent({
          startTime: new Date('2025-06-15T09:00:00Z'),
          endTime: new Date('2025-06-15T09:00:00Z'), // zero duration
          goalId,
        }),
      ] as never)

      const res = await GET(makeRequest('day'))
      const body = await res.json()

      expect(body.totalMinutes).toBe(0)
    })

    it('clamps negative durations to zero', async () => {
      const goalId = 'goal-1'
      mockGoalFindMany.mockResolvedValue([makeGoal(goalId, VALUE_A)] as never)

      mockEventFindMany.mockResolvedValue([
        makeEvent({
          startTime: new Date('2025-06-15T11:00:00Z'),
          endTime: new Date('2025-06-15T09:00:00Z'), // end before start
          goalId,
        }),
      ] as never)

      const res = await GET(makeRequest('day'))
      const body = await res.json()

      expect(body.totalMinutes).toBe(0)
    })

    it('percentages sum to approximately 100', async () => {
      const goals = [
        makeGoal('g1', { id: 'v1', label: 'A', rank: 1 }),
        makeGoal('g2', { id: 'v2', label: 'B', rank: 2 }),
        makeGoal('g3', { id: 'v3', label: 'C', rank: 3 }),
      ]
      mockGoalFindMany.mockResolvedValue(goals as never)

      mockEventFindMany.mockResolvedValue([
        makeEvent({
          startTime: new Date('2025-06-15T09:00:00Z'),
          endTime: new Date('2025-06-15T10:00:00Z'),
          goalId: 'g1',
        }),
        makeEvent({
          startTime: new Date('2025-06-15T10:00:00Z'),
          endTime: new Date('2025-06-15T11:00:00Z'),
          goalId: 'g2',
        }),
        makeEvent({
          startTime: new Date('2025-06-15T11:00:00Z'),
          endTime: new Date('2025-06-15T12:00:00Z'),
          goalId: 'g3',
        }),
      ] as never)

      const res = await GET(makeRequest('day'))
      const body = await res.json()

      const total = body.allocations.reduce(
        (s: number, a: { percentage: number }) => s + a.percentage,
        0
      )
      // Percentages are now relative to period capacity (24h = 1440 min for day),
      // not total allocated, so three 1-hour events sum to ~12% of the day.
      // 3 × 60min / 1440min × 100 ≈ 4% each → sum ≈ 12
      expect(total).toBeGreaterThanOrEqual(11)
      expect(total).toBeLessThanOrEqual(13)
    })

    it('falls back to unknown period as "week"', async () => {
      const res = await GET(makeRequest('bogus'))
      const body = await res.json()
      // Unknown period hits the else branch which is the week logic
      expect(body.daysInPeriod).toBe(7)
    })
  })

  // ─── Response shape ────────────────────────────────────────────

  describe('response shape', () => {
    it('includes all expected top-level fields', async () => {
      const res = await GET(makeRequest('day'))
      const body = await res.json()

      expect(body).toHaveProperty('period')
      expect(body).toHaveProperty('totalMinutes')
      expect(body).toHaveProperty('daysInPeriod')
      expect(body).toHaveProperty('avgMinutesPerDay')
      expect(body).toHaveProperty('allocations')
      expect(Array.isArray(body.allocations)).toBe(true)
    })

    it('includes all expected fields in each allocation entry', async () => {
      const goalId = 'goal-1'
      mockGoalFindMany.mockResolvedValue([makeGoal(goalId, VALUE_A)] as never)
      mockEventFindMany.mockResolvedValue([
        makeEvent({
          startTime: new Date('2025-06-15T09:00:00Z'),
          endTime: new Date('2025-06-15T10:00:00Z'),
          goalId,
        }),
      ] as never)

      const res = await GET(makeRequest('day'))
      const body = await res.json()
      const entry = body.allocations[0]

      expect(entry).toHaveProperty('valueId')
      expect(entry).toHaveProperty('valueLabel')
      expect(entry).toHaveProperty('totalMinutes')
      expect(entry).toHaveProperty('eventCount')
      expect(entry).toHaveProperty('color')
      expect(entry).toHaveProperty('percentage')
    })
  })
})
