"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";

interface AllocationEntry {
  goalId: string | null;
  goalTitle: string;
  totalMinutes: number;
  eventCount: number;
  color: string;
  percentage: number;
}

interface AllocationData {
  period: string;
  totalMinutes: number;
  allocations: AllocationEntry[];
}

export function TimeAllocation({ refreshKey = 0 }: { refreshKey?: number }) {
  const [data, setData] = useState<AllocationData | null>(null);
  const [period, setPeriod] = useState<"week" | "month" | "all">("week");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/schedule/allocation?period=${period}`);
        const d = await res.json();
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [period, refreshKey]);

  if (loading) {
    return (
      <Card>
        <CardTitle>Time Allocation</CardTitle>
        <div className="mt-3 flex items-center justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700" />
        </div>
      </Card>
    );
  }

  if (!data || data.allocations.length === 0) {
    return (
      <Card>
        <CardTitle>Time Allocation</CardTitle>
        <p className="mt-3 text-xs text-zinc-500">
          No scheduled events yet. Import actions or create events on the{" "}
          <a href="/schedule" className="text-blue-600 underline">
            Schedule
          </a>{" "}
          page.
        </p>
      </Card>
    );
  }

  const totalHours = Math.round(data.totalMinutes / 60 * 10) / 10;

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <CardTitle>Time Allocation</CardTitle>
        <div className="flex rounded-md border border-zinc-200 overflow-hidden">
          {(["week", "month", "all"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2 py-0.5 text-[10px] font-medium capitalize ${
                period === p
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-500 hover:bg-zinc-50"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Donut chart */}
      <div className="flex items-center gap-4 mb-3">
        <div className="relative h-24 w-24 shrink-0">
          <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
            {data.allocations.reduce(
              (acc, entry) => {
                const dashArray = (entry.percentage / 100) * 100;
                const element = (
                  <circle
                    key={entry.goalId || "unlinked"}
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="none"
                    stroke={entry.color}
                    strokeWidth="3.5"
                    strokeDasharray={`${dashArray} ${100 - dashArray}`}
                    strokeDashoffset={`${-acc.offset}`}
                  />
                );
                acc.elements.push(element);
                acc.offset += dashArray;
                return acc;
              },
              { elements: [] as React.ReactNode[], offset: 0 }
            ).elements}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-bold text-zinc-900">
              {totalHours}h
            </span>
            <span className="text-[9px] text-zinc-500">total</span>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-1.5 min-w-0 flex-1">
          {data.allocations.map((entry) => (
            <div key={entry.goalId || "unlinked"} className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-zinc-700 truncate flex-1">
                {entry.goalTitle}
              </span>
              <span className="text-xs font-medium text-zinc-900 shrink-0">
                {entry.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bar breakdown */}
      <div className="h-3 rounded-full overflow-hidden bg-zinc-100 flex">
        {data.allocations.map((entry) => (
          <div
            key={entry.goalId || "unlinked"}
            className="h-full transition-all"
            style={{
              width: `${entry.percentage}%`,
              backgroundColor: entry.color,
              minWidth: entry.percentage > 0 ? "4px" : "0",
            }}
            title={`${entry.goalTitle}: ${formatMinutes(entry.totalMinutes)} (${entry.percentage}%)`}
          />
        ))}
      </div>

      <div className="mt-2 flex justify-between text-[10px] text-zinc-400">
        <span>{data.allocations.length} goal{data.allocations.length !== 1 ? "s" : ""}</span>
        <span>{data.allocations.reduce((s, a) => s + a.eventCount, 0)} events</span>
      </div>
    </Card>
  );
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
