import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface AllocationEntry {
  goalId: string | null;
  goalTitle: string;
  totalMinutes: number;
  eventCount: number;
  color: string;
  percentage: number;
}

const GOAL_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "week"; // week, month, all

  const now = new Date();
  let start: Date;
  if (period === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === "all") {
    start = new Date(0);
  } else {
    start = new Date(now);
    start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);
  }

  // Fetch all schedule events in range
  const events = await prisma.scheduleEvent.findMany({
    where: {
      startTime: { gte: start },
      endTime: { lte: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) },
    },
  });

  // Also compute time from actions with due dates linked to goals
  const goals = await prisma.goal.findMany({
    where: { status: { in: ["ACTIVE", "BLOCKED", "WAITING"] } },
    select: { id: true, title: true },
  });

  const goalMap = new Map(goals.map((g) => [g.id, g.title]));

  // Aggregate by goalId
  const allocations = new Map<string, { minutes: number; count: number }>();

  for (const ev of events) {
    const key = ev.goalId || "__unlinked__";
    const existing = allocations.get(key) || { minutes: 0, count: 0 };
    const durationMs =
      new Date(ev.endTime).getTime() - new Date(ev.startTime).getTime();
    const durationMin = Math.max(durationMs / 60000, 0);
    existing.minutes += ev.allDay ? 480 : durationMin; // all-day = 8 hours
    existing.count += 1;
    allocations.set(key, existing);
  }

  // If no schedule events yet, estimate from actions
  if (events.length === 0) {
    const actions = await prisma.action.findMany({
      where: { status: { in: ["TODO", "IN_PROGRESS"] } },
      include: { goal: { select: { id: true, title: true } } },
    });

    for (const action of actions) {
      const key = action.goalId;
      const existing = allocations.get(key) || { minutes: 0, count: 0 };
      // Estimate 60 min per action
      existing.minutes += 60;
      existing.count += 1;
      allocations.set(key, existing);
      if (!goalMap.has(key)) {
        goalMap.set(key, action.goal.title);
      }
    }
  }

  const totalMinutes = Array.from(allocations.values()).reduce(
    (sum, a) => sum + a.minutes,
    0
  );

  const result: AllocationEntry[] = [];
  let colorIdx = 0;

  for (const [goalId, data] of allocations) {
    const isUnlinked = goalId === "__unlinked__";
    result.push({
      goalId: isUnlinked ? null : goalId,
      goalTitle: isUnlinked
        ? "Unlinked Events"
        : goalMap.get(goalId) || "Unknown Goal",
      totalMinutes: Math.round(data.minutes),
      eventCount: data.count,
      color: GOAL_COLORS[colorIdx % GOAL_COLORS.length],
      percentage: totalMinutes > 0
        ? Math.round((data.minutes / totalMinutes) * 100)
        : 0,
    });
    colorIdx++;
  }

  result.sort((a, b) => b.totalMinutes - a.totalMinutes);

  return NextResponse.json({
    period,
    totalMinutes: Math.round(totalMinutes),
    allocations: result,
  });
}
