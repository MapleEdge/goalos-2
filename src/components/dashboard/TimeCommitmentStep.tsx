"use client";

import { useEffect, useState, useCallback } from "react";

interface ExistingEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
}

interface TimeBlock {
  day: number; // 0=Sun..6=Sat
  hour: number; // 0-23
  selected: boolean;
}

interface Props {
  goalTitle: string;
  targetDate: string;
  onConfirm: (weeklyHours: number, blocks: TimeBlock[]) => void;
  onBack: () => void;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WORK_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

function getWeeksUntil(dateStr: string): number {
  if (!dateStr) return 12;
  const target = new Date(dateStr);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  return Math.max(1, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)));
}

function suggestWeeklyHours(title: string, targetDate: string): number {
  const weeks = getWeeksUntil(targetDate);
  const lower = title.toLowerCase();

  // Estimate total effort based on keywords
  let totalHours = 40;
  if (lower.includes("research") || lower.includes("paper") || lower.includes("publish")) {
    totalHours = 120;
  } else if (lower.includes("raise") || lower.includes("fund") || lower.includes("startup")) {
    totalHours = 200;
  } else if (lower.includes("learn") || lower.includes("course") || lower.includes("degree") || lower.includes("university")) {
    totalHours = 160;
  } else if (lower.includes("build") || lower.includes("develop") || lower.includes("launch")) {
    totalHours = 150;
  } else if (lower.includes("network") || lower.includes("relationship")) {
    totalHours = 60;
  } else if (lower.includes("fitness") || lower.includes("exercise") || lower.includes("health")) {
    totalHours = 80;
  }

  const perWeek = Math.ceil(totalHours / weeks);
  return Math.min(Math.max(perWeek, 1), 20);
}

function getWeekStart(): Date {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

export function TimeCommitmentStep({ goalTitle, targetDate, onConfirm, onBack }: Props) {
  const defaultHours = suggestWeeklyHours(goalTitle, targetDate);
  const [weeklyHours, setWeeklyHours] = useState(defaultHours);
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [existingEvents, setExistingEvents] = useState<ExistingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const weeks = getWeeksUntil(targetDate);

  const autoSuggestBlocks = useCallback(
    (hours: number, events: ExistingEvent[]): TimeBlock[] => {
      const occupied = new Set<string>();
      for (const ev of events) {
        const s = new Date(ev.startTime);
        const e = new Date(ev.endTime);
        const day = s.getDay();
        for (let h = s.getHours(); h < e.getHours(); h++) {
          occupied.add(`${day}-${h}`);
        }
      }

      const preferenceOrder = [
        ...[1, 2, 3, 4, 5].flatMap((d) => [14, 15, 16, 17].map((h) => ({ day: d, hour: h }))),
        ...[1, 2, 3, 4, 5].flatMap((d) => [9, 10, 11, 12, 13].map((h) => ({ day: d, hour: h }))),
        ...[1, 2, 3, 4, 5].flatMap((d) => [18, 19, 20, 21].map((h) => ({ day: d, hour: h }))),
        ...[6, 0].flatMap((d) =>
          [10, 11, 12, 13, 14, 15, 16, 17].map((h) => ({ day: d, hour: h }))
        ),
      ];

      const result: TimeBlock[] = [];
      let remaining = hours;
      for (const slot of preferenceOrder) {
        if (remaining <= 0) break;
        if (!occupied.has(`${slot.day}-${slot.hour}`)) {
          result.push({ day: slot.day, hour: slot.hour, selected: true });
          remaining--;
        }
      }
      return result;
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const start = getWeekStart();
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      try {
        const res = await fetch(
          `/api/schedule?start=${start.toISOString()}&end=${end.toISOString()}`
        );
        const data = await res.json();
        if (!cancelled) {
          setExistingEvents(data);
          setBlocks(autoSuggestBlocks(weeklyHours, data));
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setExistingEvents([]);
          setBlocks(autoSuggestBlocks(weeklyHours, []));
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [autoSuggestBlocks, weeklyHours]);

  function handleHoursChange(newHours: number) {
    setWeeklyHours(newHours);
    setBlocks(autoSuggestBlocks(newHours, existingEvents));
  }

  function toggleBlock(day: number, hour: number) {
    setBlocks((prev) => {
      const existing = prev.find((b) => b.day === day && b.hour === hour);
      if (existing) {
        return prev.filter((b) => !(b.day === day && b.hour === hour));
      }
      return [...prev, { day, hour, selected: true }];
    });
  }

  function isOccupied(day: number, hour: number): boolean {
    for (const ev of existingEvents) {
      const s = new Date(ev.startTime);
      const e = new Date(ev.endTime);
      if (s.getDay() === day && hour >= s.getHours() && hour < e.getHours()) {
        return true;
      }
    }
    return false;
  }

  function getEventAt(day: number, hour: number): ExistingEvent | null {
    return existingEvents.find((ev) => {
      const s = new Date(ev.startTime);
      const e = new Date(ev.endTime);
      return s.getDay() === day && hour >= s.getHours() && hour < e.getHours();
    }) ?? null;
  }

  function isSelected(day: number, hour: number): boolean {
    return blocks.some((b) => b.day === day && b.hour === hour && b.selected);
  }

  const selectedCount = blocks.filter((b) => b.selected).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700" />
        <p className="mt-3 text-sm text-zinc-500">Loading your schedule...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-zinc-800">
          Time Commitment
        </h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          How many hours per week will you dedicate to &ldquo;{goalTitle}&rdquo;?
        </p>
      </div>

      {/* Weekly hours selector */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-zinc-600">
            Weekly commitment
          </span>
          <span className="text-sm font-bold text-zinc-900">
            {weeklyHours}h / week
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={20}
          value={weeklyHours}
          onChange={(e) => handleHoursChange(Number(e.target.value))}
          className="w-full accent-zinc-900"
        />
        <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
          <span>1h</span>
          <span>10h</span>
          <span>20h</span>
        </div>
        {targetDate && (
          <p className="mt-2 text-xs text-zinc-500">
            {weeks} week{weeks !== 1 ? "s" : ""} until target date
            {" · "}
            ~{weeklyHours * weeks}h total estimated
          </p>
        )}
      </div>

      {/* Mini weekly calendar */}
      <div>
        <p className="text-xs font-medium text-zinc-600 mb-2">
          Select time blocks ({selectedCount}h selected of {weeklyHours}h target)
        </p>
        <div className="rounded-lg border border-zinc-200 overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-[40px_repeat(7,1fr)] bg-zinc-100 border-b border-zinc-200">
            <div className="py-1.5" />
            {DAY_LABELS.map((d, i) => (
              <div
                key={d}
                className={`py-1.5 text-center text-[10px] font-medium ${
                  i === new Date().getDay()
                    ? "text-blue-600 bg-blue-50"
                    : "text-zinc-500"
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Time grid */}
          <div className="max-h-[240px] overflow-y-auto">
            {WORK_HOURS.map((hour) => (
              <div
                key={hour}
                className="grid grid-cols-[40px_repeat(7,1fr)] border-b border-zinc-100 last:border-0"
              >
                <div className="py-1 px-1 text-[9px] text-zinc-400 text-right pr-2 leading-6">
                  {hour === 0
                    ? "12a"
                    : hour < 12
                    ? `${hour}a`
                    : hour === 12
                    ? "12p"
                    : `${hour - 12}p`}
                </div>
                {DAY_LABELS.map((_, day) => {
                  const occ = isOccupied(day, hour);
                  const sel = isSelected(day, hour);
                  const ev = occ ? getEventAt(day, hour) : null;
                  return (
                    <button
                      key={`${day}-${hour}`}
                      type="button"
                      disabled={occ}
                      onClick={() => toggleBlock(day, hour)}
                      className={`h-6 border-l border-zinc-100 text-[8px] truncate px-0.5 transition-colors ${
                        occ
                          ? "bg-red-100 text-red-600 cursor-not-allowed"
                          : sel
                          ? "bg-emerald-500 text-white"
                          : "hover:bg-emerald-50"
                      }`}
                      title={
                        occ && ev
                          ? `Busy: ${ev.title}`
                          : sel
                          ? "Click to remove"
                          : "Click to add"
                      }
                    >
                      {occ && ev ? ev.title.slice(0, 8) : sel ? goalTitle.slice(0, 6) : ""}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-3 mt-1.5 text-[10px] text-zinc-400">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" />
            Your commitment
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-100" />
            Busy
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-white border border-zinc-200" />
            Available
          </span>
        </div>
      </div>

      {selectedCount !== weeklyHours && (
        <p className="text-xs text-amber-600">
          {selectedCount < weeklyHours
            ? `Select ${weeklyHours - selectedCount} more hour${weeklyHours - selectedCount !== 1 ? "s" : ""} to match your target`
            : `${selectedCount - weeklyHours} hour${selectedCount - weeklyHours !== 1 ? "s" : ""} over target — that's fine if intentional`}
        </p>
      )}

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
        >
          Back
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onConfirm(weeklyHours, [])}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => onConfirm(weeklyHours, blocks)}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Confirm & Create
          </button>
        </div>
      </div>
    </div>
  );
}
