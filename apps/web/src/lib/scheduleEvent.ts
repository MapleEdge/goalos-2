/**
 * Shared contract for opening the schedule page's event modal pre-filled from a
 * natural-language command (e.g. "schedule a call with John tomorrow at 3pm").
 *
 * `GoalPrompt` parses the input into a `PrefilledEvent`, stashes it (via
 * `sessionStorage` for a cross-page navigation, or a `CustomEvent` when already
 * on `/schedule`), and the schedule page reads it to open `EventModal`.
 */

/** sessionStorage key used to hand a parsed event across a full-page navigation. */
export const NEW_EVENT_KEY = 'goalos:newEvent'

/** Window event dispatched to open the modal when already on the schedule page. */
export const NEW_EVENT_EVENT = 'goalos:new-event'

export interface PrefilledEvent {
  title: string
  description?: string
  /** ISO datetime string. */
  start: string
  /** ISO datetime string. */
  end: string
  allDay: boolean
}

const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

const MONTHS: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  sept: 8,
  oct: 9,
  nov: 10,
  dec: 11,
}

const MONTH_ALT = Object.keys(MONTHS).join('|')

const LEADING_VERB =
  /^\s*(?:please\s+)?(?:schedule|set\s*up|book|arrange|plan|add|create|new|put)\s+(?:(?:a|an|the|my)\s+)?/i

const PRIORITY_PHRASE =
  /(?:,\s*)?\b(?:it'?s|it is|this is)?\s*(?:really\s+)?(?:urgent|important|asap|high priority|top priority)\b\.?/gi

const CALENDAR_TAIL = /\b(?:to|on|in)\s+(?:my\s+)?(?:calendar|schedule)\b/i

const DEFAULT_HOUR_BY_PART: Record<string, number> = {
  morning: 9,
  afternoon: 14,
  evening: 18,
  tonight: 19,
}

/**
 * Parses a free-form scheduling command into a concrete event. Heuristic and
 * forgiving — anything it can't resolve falls back to sensible defaults (the
 * next hour, a one-hour duration, and a generic title) so the modal always
 * opens with something editable.
 */
export function parseEventInput(
  input: string,
  now: Date = new Date()
): PrefilledEvent {
  let text = ` ${input.trim()} `

  const base = new Date(now)
  base.setSeconds(0, 0)

  let hasTime = false
  let hour = 9
  let minute = 0
  let allDay = false

  if (/\ball[\s-]?day\b/i.test(text)) {
    allDay = true
    text = text.replace(/\ball[\s-]?day\b/i, ' ')
  }

  // --- time of day ---------------------------------------------------------
  const clock =
    text.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i) ||
    text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i)
  if (clock) {
    hasTime = true
    hour = Number.parseInt(clock[1] ?? '9', 10)
    minute = clock[2] ? Number.parseInt(clock[2], 10) : 0
    const mer = clock[3]?.toLowerCase()
    if (mer === 'pm' && hour < 12) hour += 12
    if (mer === 'am' && hour === 12) hour = 0
    text = text.replace(clock[0], ' ')
  } else if (/\bnoon\b/i.test(text)) {
    hasTime = true
    hour = 12
    minute = 0
    text = text.replace(/\bnoon\b/i, ' ')
  } else if (/\bmidnight\b/i.test(text)) {
    hasTime = true
    hour = 0
    minute = 0
    text = text.replace(/\bmidnight\b/i, ' ')
  } else {
    for (const part of Object.keys(DEFAULT_HOUR_BY_PART)) {
      const re = new RegExp(`\\b${part}\\b`, 'i')
      if (re.test(text)) {
        hour = DEFAULT_HOUR_BY_PART[part] ?? 9
        if (part !== 'tonight') text = text.replace(re, ' ')
        break
      }
    }
  }

  // --- date ----------------------------------------------------------------
  if (/\btomorrow\b/i.test(text)) {
    base.setDate(base.getDate() + 1)
    text = text.replace(/\btomorrow\b/i, ' ')
  } else if (/\btoday\b/i.test(text)) {
    text = text.replace(/\btoday\b/i, ' ')
  } else if (/\bnext week\b/i.test(text)) {
    base.setDate(base.getDate() + 7)
    text = text.replace(/\bnext week\b/i, ' ')
  } else if (/\btonight\b/i.test(text)) {
    if (!hasTime) hour = 19
    text = text.replace(/\btonight\b/i, ' ')
  } else {
    const weekday = text
      .toLowerCase()
      .match(/\b(next\s+)?(sun|mon|tues?|wednes|thurs?|fri|satur)day\b/)
    const monthDay =
      text
        .toLowerCase()
        .match(new RegExp(`\\b(${MONTH_ALT})\\s+(\\d{1,2})\\b`)) ||
      text.toLowerCase().match(new RegExp(`\\b(\\d{1,2})\\s+(${MONTH_ALT})\\b`))
    if (weekday) {
      const name = weekday[0].replace(/^next\s+/, '')
      const target = WEEKDAYS.indexOf(name)
      if (target >= 0) {
        let diff = (target - base.getDay() + 7) % 7
        if (diff === 0) diff = 7
        base.setDate(base.getDate() + diff)
        text = text.replace(new RegExp(`\\b(next\\s+)?${name}\\b`, 'i'), ' ')
      }
    } else if (monthDay) {
      const monthName =
        MONTHS[monthDay[1] ?? ''] !== undefined ? monthDay[1] : monthDay[2]
      const dayStr =
        MONTHS[monthDay[1] ?? ''] !== undefined ? monthDay[2] : monthDay[1]
      const month = MONTHS[monthName ?? '']
      const day = Number.parseInt(dayStr ?? '1', 10)
      if (month !== undefined && day >= 1 && day <= 31) {
        let year = base.getFullYear()
        const candidate = new Date(year, month, day)
        if (
          candidate.getTime() <
          new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
        ) {
          year += 1
        }
        base.setFullYear(year, month, day)
        text = text.replace(monthDay[0], ' ')
      }
    }
  }

  base.setHours(hour, minute, 0, 0)
  const start = allDay
    ? new Date(base.getFullYear(), base.getMonth(), base.getDate())
    : base
  const end = allDay
    ? new Date(start.getTime() + 24 * 60 * 60 * 1000)
    : new Date(start.getTime() + 60 * 60 * 1000)

  // --- description ("about ...", "to discuss ...") -------------------------
  let description = ''
  const about = text.match(
    /\b(?:about|regarding|re:?|to\s+(?:discuss|review|cover|go over|talk about|prepare|prep))\s+(.+)$/i
  )
  if (about) {
    description = cleanFragment(about[1] ?? '')
    text = text.slice(0, about.index ?? text.length)
  }

  // --- title ---------------------------------------------------------------
  text = text
    .replace(LEADING_VERB, ' ')
    .replace(CALENDAR_TAIL, ' ')
    .replace(PRIORITY_PHRASE, ' ')
    .replace(/\bwith\s+(?:the\s+)?$/i, ' ')
  let title = cleanFragment(text)
  if (title) title = title.charAt(0).toUpperCase() + title.slice(1)
  if (!title) title = 'New event'

  return {
    title,
    description: description || undefined,
    start: start.toISOString(),
    end: end.toISOString(),
    allDay,
  }
}

/** Trims filler, dangling connectors and stray punctuation from a fragment. */
function cleanFragment(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/^[\s,.-]+|[\s,.-]+$/g, '')
    .replace(/^(?:a|an|the|my)\s+/i, '')
    .replace(/\b(?:on|at|in|with|for|to|next)$/i, '')
    .replace(/^[\s,.-]+|[\s,.-]+$/g, '')
    .trim()
}
