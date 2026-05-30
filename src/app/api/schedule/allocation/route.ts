import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface AllocationEntry {
  valueId: string | null;
  valueLabel: string;
  totalMinutes: number;
  eventCount: number;
  color: string;
  percentage: number;
}

const VALUE_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

const UNLINKED_KEY = "__unlinked__";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "week"; // day, week, month, all

  const now = new Date();
  let start: Date;
  let daysInPeriod: number;
  if (period === "day") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    daysInPeriod = 1;
  } else if (period === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    daysInPeriod = Math.ceil((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) || 1;
  } else if (period === "all") {
    start = new Date(0);
    daysInPeriod = 0; // computed after fetching events
  } else {
    start = new Date(now);
    start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);
    daysInPeriod = 7;
  }

  // Fetch all schedule events in range
  const events = await prisma.scheduleEvent.findMany({
    where: {
      startTime: { gte: start },
      endTime: { lte: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) },
    },
  });

  // Map every goal to the value it aligns with (any status, since events may
  // reference completed goals too).
  const goals = await prisma.goal.findMany({
    select: {
      id: true,
      valueId: true,
      value: { select: { id: true, label: true, rank: true } },
    },
  });

  const goalToValue = new Map<
    string,
    { id: string; label: string; rank: number } | null
  >(goals.map((g) => [g.id, g.value]));

  // Aggregate by valueId (events whose goal has no value, or events with no
  // goal at all, fall into the "Unlinked" bucket).
  const allocations = new Map<
    string,
    { minutes: number; count: number; label: string; rank: number }
  >();

  function bucketFor(goalId: string | null) {
    const value = goalId ? goalToValue.get(goalId) : null;
    if (value) {
      return { key: value.id, label: value.label, rank: value.rank };
    }
    return { key: UNLINKED_KEY, label: "Unlinked Events", rank: Number.MAX_SAFE_INTEGER };
  }

  for (const ev of events) {
    const { key, label, rank } = bucketFor(ev.goalId);
    const existing = allocations.get(key) || { minutes: 0, count: 0, label, rank };
    const durationMs =
      new Date(ev.endTime).getTime() - new Date(ev.startTime).getTime();
    const durationMin = Math.max(durationMs / 60000, 0);
    existing.minutes += ev.allDay ? 480 : durationMin; // all-day = 8 hours
    existing.count += 1;
    allocations.set(key, existing);
  }

  // Onboarding fallback: only when there are NO schedule events at all (not
  // just none in the selected period), estimate from open actions. If events
  // exist elsewhere but none in this period, leave allocations empty so the UI
  // can show a truthful "no time allocated" state for that period.
  if (events.length === 0) {
    const totalEventCount = await prisma.scheduleEvent.count();
    if (totalEventCount === 0) {
      const actions = await prisma.action.findMany({
        where: { status: { in: ["TODO", "IN_PROGRESS"] } },
        select: { goalId: true },
      });

      for (const action of actions) {
        const { key, label, rank } = bucketFor(action.goalId);
        const existing = allocations.get(key) || { minutes: 0, count: 0, label, rank };
        // Estimate 60 min per action
        existing.minutes += 60;
        existing.count += 1;
        allocations.set(key, existing);
      }
    }
  }

  const totalMinutes = Array.from(allocations.values()).reduce(
    (sum, a) => sum + a.minutes,
    0
  );

  // Order by value rank so the legend matches the values list (unlinked last).
  const ordered = Array.from(allocations.entries()).sort(
    ([, a], [, b]) => a.rank - b.rank
  );

  const result: AllocationEntry[] = ordered.map(([key, data], idx) => ({
    valueId: key === UNLINKED_KEY ? null : key,
    valueLabel: data.label,
    totalMinutes: Math.round(data.minutes),
    eventCount: data.count,
    color: VALUE_COLORS[idx % VALUE_COLORS.length],
    percentage: totalMinutes > 0
      ? Math.round((data.minutes / totalMinutes) * 100)
      : 0,
  }));

  // For "all" period, compute days from earliest event to now
  if (period === "all" && events.length > 0) {
    const earliest = events.reduce((min, ev) => {
      const t = new Date(ev.startTime).getTime();
      return t < min ? t : min;
    }, Infinity);
    daysInPeriod = Math.ceil((now.getTime() - earliest) / (24 * 60 * 60 * 1000)) || 1;
  } else if (period === "all") {
    daysInPeriod = 1;
  }

  const avgMinutesPerDay = daysInPeriod > 0 ? Math.round(totalMinutes / daysInPeriod) : 0;

  return NextResponse.json({
    period,
    totalMinutes: Math.round(totalMinutes),
    daysInPeriod,
    avgMinutesPerDay,
    allocations: result,
  });
}
