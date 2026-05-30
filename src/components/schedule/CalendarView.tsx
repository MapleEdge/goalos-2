"use client";

interface ScheduleEvent {
  id: string;
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  allDay: boolean;
  location?: string | null;
  source: "GOALOS" | "GOOGLE" | "MICROSOFT";
  goalId?: string | null;
  actionId?: string | null;
  color?: string | null;
  calendarConnection?: {
    provider: string;
    accountEmail: string;
  } | null;
}

interface CalendarViewProps {
  events: ScheduleEvent[];
  view: "week" | "month";
  currentDate: Date;
  onSlotClick: (start: Date, end: Date) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarView({
  events,
  view,
  currentDate,
  onSlotClick,
}: CalendarViewProps) {
  if (view === "month") return <MonthView events={events} currentDate={currentDate} onSlotClick={onSlotClick} />;
  return <WeekView events={events} currentDate={currentDate} onSlotClick={onSlotClick} />;
}

function WeekView({
  events,
  currentDate,
  onSlotClick,
}: Omit<CalendarViewProps, "view">) {
  const weekStart = new Date(currentDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-zinc-200">
        <div className="border-r border-zinc-100" />
        {days.map((day, i) => {
          const isToday = day.getTime() === today.getTime();
          return (
            <div
              key={i}
              className={`px-2 py-2 text-center border-r border-zinc-100 last:border-r-0 ${
                isToday ? "bg-blue-50" : ""
              }`}
            >
              <div className="text-xs text-zinc-500">{DAYS[day.getDay()]}</div>
              <div
                className={`text-sm font-semibold ${
                  isToday
                    ? "inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white"
                    : "text-zinc-900"
                }`}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="max-h-[600px] overflow-y-auto">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] relative">
          {/* Hour labels + rows */}
          {HOURS.map((hour) => (
            <div key={hour} className="contents">
              <div className="border-r border-zinc-100 pr-2 text-right text-xs text-zinc-400 h-14 flex items-start justify-end pt-0.5">
                {hour === 0 ? "" : formatHour(hour)}
              </div>
              {days.map((day, di) => {
                const dayEvents = getEventsForHour(events, day, hour);
                return (
                  <div
                    key={di}
                    className="border-r border-b border-zinc-100 last:border-r-0 h-14 relative cursor-pointer hover:bg-zinc-50 transition-colors"
                    onClick={() => {
                      const start = new Date(day);
                      start.setHours(hour, 0, 0, 0);
                      const end = new Date(day);
                      end.setHours(hour + 1, 0, 0, 0);
                      onSlotClick(start, end);
                    }}
                  >
                    {dayEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="absolute inset-x-0.5 rounded px-1 py-0.5 text-xs font-medium truncate z-10"
                        style={{
                          backgroundColor: ev.color || sourceColor(ev.source),
                          color: "#fff",
                          top: `${getEventTopOffset(ev)}%`,
                          height: `${Math.min(getEventHeight(ev, hour), 100)}%`,
                          minHeight: "18px",
                        }}
                        title={`${ev.title}${ev.location ? ` — ${ev.location}` : ""}`}
                      >
                        {ev.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MonthView({
  events,
  currentDate,
  onSlotClick,
}: Omit<CalendarViewProps, "view">) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const weeks: Date[][] = [];
  const cursor = new Date(startDate);
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    if (cursor.getMonth() !== month && cursor.getDay() === 0) break;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="grid grid-cols-7 border-b border-zinc-200">
        {DAYS.map((day) => (
          <div
            key={day}
            className="px-2 py-2 text-center text-xs font-medium text-zinc-500 border-r border-zinc-100 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-zinc-100 last:border-b-0">
          {week.map((day, di) => {
            const isCurrentMonth = day.getMonth() === month;
            const isToday = day.getTime() === today.getTime();
            const dayEvents = getEventsForDay(events, day);
            return (
              <div
                key={di}
                className={`min-h-24 border-r border-zinc-100 last:border-r-0 p-1 cursor-pointer hover:bg-zinc-50 transition-colors ${
                  !isCurrentMonth ? "bg-zinc-50/50" : ""
                }`}
                onClick={() => {
                  const start = new Date(day);
                  start.setHours(9, 0, 0, 0);
                  const end = new Date(day);
                  end.setHours(10, 0, 0, 0);
                  onSlotClick(start, end);
                }}
              >
                <div
                  className={`text-xs mb-1 ${
                    isToday
                      ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white font-bold"
                      : isCurrentMonth
                        ? "text-zinc-700 font-medium"
                        : "text-zinc-400"
                  }`}
                >
                  {day.getDate()}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded px-1 py-0.5 text-xs truncate"
                      style={{
                        backgroundColor: ev.color || sourceColor(ev.source),
                        color: "#fff",
                      }}
                      title={ev.title}
                    >
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-zinc-500 pl-1">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

function sourceColor(source: string): string {
  switch (source) {
    case "GOOGLE": return "#4285f4";
    case "MICROSOFT": return "#00a4ef";
    default: return "#3b82f6";
  }
}

function getEventsForDay(events: ScheduleEvent[], day: Date): ScheduleEvent[] {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);

  return events.filter((ev) => {
    const start = new Date(ev.startTime);
    const end = new Date(ev.endTime);
    return start <= dayEnd && end >= dayStart;
  });
}

function getEventsForHour(
  events: ScheduleEvent[],
  day: Date,
  hour: number
): ScheduleEvent[] {
  const hourStart = new Date(day);
  hourStart.setHours(hour, 0, 0, 0);
  const hourEnd = new Date(day);
  hourEnd.setHours(hour, 59, 59, 999);

  return events.filter((ev) => {
    if (ev.allDay) return false;
    const start = new Date(ev.startTime);
    const end = new Date(ev.endTime);
    return start <= hourEnd && end > hourStart;
  });
}

function getEventTopOffset(ev: ScheduleEvent): number {
  const start = new Date(ev.startTime);
  return (start.getMinutes() / 60) * 100;
}

function getEventHeight(ev: ScheduleEvent, hour: number): number {
  const start = new Date(ev.startTime);
  const end = new Date(ev.endTime);
  const hourStart = new Date(start);
  hourStart.setHours(hour, 0, 0, 0);
  const hourEnd = new Date(start);
  hourEnd.setHours(hour + 1, 0, 0, 0);

  const effectiveStart = start > hourStart ? start : hourStart;
  const effectiveEnd = end < hourEnd ? end : hourEnd;
  const durationMins =
    (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60);
  return (durationMins / 60) * 100;
}
