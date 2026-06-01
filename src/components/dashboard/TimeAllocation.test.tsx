import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TimeAllocation } from './TimeAllocation'

// ── Types ────────────────────────────────────────────────────────

interface AllocationEntry {
  valueId: string | null
  valueLabel: string
  totalMinutes: number
  eventCount: number
  color: string
  percentage: number
}

interface AllocationData {
  period: string
  totalMinutes: number
  daysInPeriod: number
  avgMinutesPerDay: number
  allocations: AllocationEntry[]
}

// ── Fixtures ─────────────────────────────────────────────────────

function makeResponse(overrides: Partial<AllocationData> = {}): AllocationData {
  return {
    period: 'week',
    totalMinutes: 1620,
    daysInPeriod: 7,
    avgMinutesPerDay: 231,
    allocations: [
      {
        valueId: 'v1',
        valueLabel: 'Career Growth',
        totalMinutes: 900,
        eventCount: 5,
        color: '#3b82f6',
        percentage: 56,
      },
      {
        valueId: 'v2',
        valueLabel: 'Knowledge & Learning',
        totalMinutes: 420,
        eventCount: 6,
        color: '#10b981',
        percentage: 26,
      },
      {
        valueId: 'v3',
        valueLabel: 'Health & Fitness',
        totalMinutes: 300,
        eventCount: 4,
        color: '#f59e0b',
        percentage: 19,
      },
    ],
    ...overrides,
  }
}

const emptyResponse: AllocationData = {
  period: 'week',
  totalMinutes: 0,
  daysInPeriod: 7,
  avgMinutesPerDay: 0,
  allocations: [],
}

// ── Setup ────────────────────────────────────────────────────────

let fetchSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, 'fetch')
})

afterEach(() => {
  vi.restoreAllMocks()
})

function mockFetch(data: AllocationData) {
  fetchSpy.mockResolvedValue(
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  )
}

function mockFetchByPeriod(map: Record<string, AllocationData>) {
  fetchSpy.mockImplementation((input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input.toString()
    const params = new URL(url, 'http://localhost').searchParams
    const period = params.get('period') || 'week'
    const data = map[period] || emptyResponse
    return Promise.resolve(
      new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
  })
}

// ── Tests ────────────────────────────────────────────────────────

describe('TimeAllocation component', () => {
  // ─── Loading state ─────────────────────────────────────────────

  describe('loading state', () => {
    it('shows a loading spinner initially', () => {
      // Never resolve the fetch
      fetchSpy.mockReturnValue(new Promise(() => {}))
      render(<TimeAllocation />)
      expect(screen.getByText('Time Allocation')).toBeInTheDocument()
      // The spinner is an animated div, verify the card renders while loading
      expect(screen.queryByText(/avg/)).not.toBeInTheDocument()
    })
  })

  // ─── Empty state ───────────────────────────────────────────────

  describe('empty state', () => {
    it('shows "No time allocated" when allocations are empty', async () => {
      mockFetch(emptyResponse)
      render(<TimeAllocation />)

      await waitFor(() => {
        expect(
          screen.getByText(/No time allocated this week/)
        ).toBeInTheDocument()
      })
    })

    it('shows a link to the Schedule page', async () => {
      mockFetch(emptyResponse)
      render(<TimeAllocation />)

      await waitFor(() => {
        const link = screen.getByRole('link', { name: /Schedule/ })
        expect(link).toHaveAttribute('href', '/schedule')
      })
    })

    it('displays period-specific empty label for "day"', async () => {
      mockFetchByPeriod({
        day: { ...emptyResponse, period: 'day' },
        week: emptyResponse,
      })
      render(<TimeAllocation />)

      // Wait for initial load (defaults to week)
      await waitFor(() => {
        expect(screen.getByText(/No time allocated/)).toBeInTheDocument()
      })

      // Switch to day
      fireEvent.click(screen.getByText('day'))

      await waitFor(() => {
        expect(screen.getByText(/No time allocated today/)).toBeInTheDocument()
      })
    })

    it('displays period-specific empty label for "month"', async () => {
      mockFetchByPeriod({
        month: { ...emptyResponse, period: 'month' },
        week: emptyResponse,
      })
      render(<TimeAllocation />)

      await waitFor(() => {
        expect(screen.getByText(/No time allocated/)).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('month'))

      await waitFor(() => {
        expect(
          screen.getByText(/No time allocated this month/)
        ).toBeInTheDocument()
      })
    })

    it('displays period-specific empty label for "all"', async () => {
      mockFetchByPeriod({
        all: { ...emptyResponse, period: 'all' },
        week: emptyResponse,
      })
      render(<TimeAllocation />)

      await waitFor(() => {
        expect(screen.getByText(/No time allocated/)).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('all'))

      await waitFor(() => {
        expect(screen.getByText(/No time allocated yet/)).toBeInTheDocument()
      })
    })
  })

  // ─── Data display ──────────────────────────────────────────────

  describe('data display', () => {
    it('renders total hours in the donut center', async () => {
      mockFetch(makeResponse())
      render(<TimeAllocation />)

      await waitFor(() => {
        expect(screen.getByText('27h')).toBeInTheDocument()
        expect(screen.getByText('total')).toBeInTheDocument()
      })
    })

    it('renders all value labels in the legend', async () => {
      mockFetch(makeResponse())
      render(<TimeAllocation />)

      await waitFor(() => {
        expect(screen.getByText('Career Growth')).toBeInTheDocument()
        expect(screen.getByText('Knowledge & Learning')).toBeInTheDocument()
        expect(screen.getByText('Health & Fitness')).toBeInTheDocument()
      })
    })

    it('renders percentage for each allocation', async () => {
      mockFetch(makeResponse())
      render(<TimeAllocation />)

      await waitFor(() => {
        expect(screen.getByText('56%')).toBeInTheDocument()
        expect(screen.getByText('26%')).toBeInTheDocument()
        expect(screen.getByText('19%')).toBeInTheDocument()
      })
    })

    it('renders the value count footer', async () => {
      mockFetch(makeResponse())
      render(<TimeAllocation />)

      await waitFor(() => {
        expect(screen.getByText('3 values')).toBeInTheDocument()
      })
    })

    it('renders event count footer', async () => {
      mockFetch(makeResponse())
      render(<TimeAllocation />)

      await waitFor(() => {
        expect(screen.getByText('15 events')).toBeInTheDocument()
      })
    })

    it('renders avg per day in the footer', async () => {
      mockFetch(makeResponse())
      render(<TimeAllocation />)

      await waitFor(() => {
        expect(screen.getByText(/avg 3h 51m\/day/)).toBeInTheDocument()
      })
    })

    it('uses singular "value" when only one allocation exists', async () => {
      mockFetch(
        makeResponse({
          allocations: [
            {
              valueId: 'v1',
              valueLabel: 'Career Growth',
              totalMinutes: 900,
              eventCount: 5,
              color: '#3b82f6',
              percentage: 100,
            },
          ],
        })
      )
      render(<TimeAllocation />)

      await waitFor(() => {
        expect(screen.getByText('1 value')).toBeInTheDocument()
      })
    })

    it('formats avgMinutesPerDay as minutes-only when < 60', async () => {
      mockFetch(makeResponse({ avgMinutesPerDay: 45 }))
      render(<TimeAllocation />)

      await waitFor(() => {
        expect(screen.getByText(/avg 45m\/day/)).toBeInTheDocument()
      })
    })

    it('formats avgMinutesPerDay as hours-only when evenly divisible', async () => {
      mockFetch(makeResponse({ avgMinutesPerDay: 120 }))
      render(<TimeAllocation />)

      await waitFor(() => {
        expect(screen.getByText(/avg 2h\/day/)).toBeInTheDocument()
      })
    })

    it('rounds totalHours to one decimal place', async () => {
      // 150 min = 2.5h
      mockFetch(makeResponse({ totalMinutes: 150 }))
      render(<TimeAllocation />)

      await waitFor(() => {
        expect(screen.getByText('2.5h')).toBeInTheDocument()
      })
    })
  })

  // ─── Period switching ──────────────────────────────────────────

  describe('period switching', () => {
    it('renders all four period buttons', async () => {
      mockFetch(makeResponse())
      render(<TimeAllocation />)

      await waitFor(() => {
        expect(screen.getByText('day')).toBeInTheDocument()
        expect(screen.getByText('week')).toBeInTheDocument()
        expect(screen.getByText('month')).toBeInTheDocument()
        expect(screen.getByText('all')).toBeInTheDocument()
      })
    })

    it('defaults to "week" period', async () => {
      mockFetch(makeResponse())
      render(<TimeAllocation />)

      await waitFor(() => {
        const call = fetchSpy.mock.calls[0]?.[0] as string
        expect(call).toContain('period=week')
      })
    })

    it('fetches with the correct period when switching to "day"', async () => {
      mockFetchByPeriod({
        week: makeResponse(),
        day: makeResponse({
          period: 'day',
          totalMinutes: 300,
          daysInPeriod: 1,
          avgMinutesPerDay: 300,
        }),
      })
      render(<TimeAllocation />)

      await waitFor(() => {
        expect(screen.getByText('27h')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('day'))

      await waitFor(() => {
        expect(screen.getByText('5h')).toBeInTheDocument()
      })
    })

    it('fetches with the correct period when switching to "month"', async () => {
      mockFetchByPeriod({
        week: makeResponse(),
        month: makeResponse({
          period: 'month',
          totalMinutes: 2400,
          daysInPeriod: 30,
          avgMinutesPerDay: 80,
        }),
      })
      render(<TimeAllocation />)

      await waitFor(() => {
        expect(screen.getByText('27h')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('month'))

      await waitFor(() => {
        expect(screen.getByText('40h')).toBeInTheDocument()
      })
    })
  })

  // ─── refreshKey prop ───────────────────────────────────────────

  describe('refreshKey prop', () => {
    it('re-fetches data when refreshKey changes', async () => {
      mockFetch(makeResponse())

      const { rerender } = render(<TimeAllocation refreshKey={0} />)

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledTimes(1)
      })

      rerender(<TimeAllocation refreshKey={1} />)

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledTimes(2)
      })
    })
  })

  // ─── Error handling ────────────────────────────────────────────

  describe('error handling', () => {
    it('stops loading when fetch rejects', async () => {
      fetchSpy.mockRejectedValue(new Error('Network error'))
      render(<TimeAllocation />)

      // Should not crash and should exit loading state
      await waitFor(() => {
        // The component shows empty state or no allocations
        expect(screen.getByText('Time Allocation')).toBeInTheDocument()
      })
    })
  })

  // ─── SVG donut chart ───────────────────────────────────────────

  describe('donut chart', () => {
    it('renders circle elements for each allocation', async () => {
      mockFetch(makeResponse())
      const { container } = render(<TimeAllocation />)

      await waitFor(() => {
        const circles = container.querySelectorAll('circle')
        expect(circles.length).toBe(3) // 3 allocations
      })
    })

    it('applies correct stroke colors from allocation data', async () => {
      mockFetch(makeResponse())
      const { container } = render(<TimeAllocation />)

      await waitFor(() => {
        const circles = container.querySelectorAll('circle')
        expect(circles[0]?.getAttribute('stroke')).toBe('#3b82f6')
        expect(circles[1]?.getAttribute('stroke')).toBe('#10b981')
        expect(circles[2]?.getAttribute('stroke')).toBe('#f59e0b')
      })
    })
  })

  // ─── Bar breakdown ─────────────────────────────────────────────

  describe('bar breakdown', () => {
    it('renders a bar segment for each allocation with correct width', async () => {
      mockFetch(makeResponse())
      const { container } = render(<TimeAllocation />)

      await waitFor(() => {
        const bars = container.querySelectorAll('.rounded-full > div')
        expect(bars.length).toBe(3)
        expect((bars[0] as HTMLElement).style.width).toBe('56%')
        expect((bars[1] as HTMLElement).style.width).toBe('26%')
        expect((bars[2] as HTMLElement).style.width).toBe('19%')
      })
    })

    it('renders bar segments with correct background colors', async () => {
      mockFetch(makeResponse())
      const { container } = render(<TimeAllocation />)

      await waitFor(() => {
        const bars = container.querySelectorAll('.rounded-full > div')
        expect((bars[0] as HTMLElement).style.backgroundColor).toBe(
          'rgb(59, 130, 246)'
        )
      })
    })
  })
})
