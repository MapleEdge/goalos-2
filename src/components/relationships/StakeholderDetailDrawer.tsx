"use client";

import { useEffect, useState } from "react";
import type { RelationshipHealth } from "@/lib/reasoning/relationships";

interface InteractionEvent {
  id: string;
  eventType: string;
  occurredAt: string;
  payload: {
    type?: string;
    note?: string | null;
    strengthDelta?: number;
    previousStrength?: number;
    newStrength?: number;
  };
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) {
    return (
      <p className="text-xs text-zinc-400">
        Log more interactions to see a strength trend.
      </p>
    );
  }
  const w = 240;
  const h = 48;
  const max = 100;
  const stepX = w / (points.length - 1);
  const coords = points.map((p, i) => [i * stepX, h - (p / max) * h] as const);
  const path = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const up = points[points.length - 1] >= points[0];
  const stroke = up ? "#10b981" : "#ef4444";
  return (
    <svg width={w} height={h} className="overflow-visible">
      <path d={path} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2.5} fill={stroke} />
      ))}
    </svg>
  );
}

export function StakeholderDetailDrawer({
  item,
  onClose,
  onLog,
}: {
  item: RelationshipHealth;
  onClose: () => void;
  onLog: () => void;
}) {
  const [events, setEvents] = useState<InteractionEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/stakeholders/${item.stakeholderId}/interactions`);
        const data = await res.json();
        if (!cancelled) setEvents(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [item.stakeholderId]);

  // Trend: oldest -> newest strength values reconstructed from the event log.
  const ascending = [...events]
    .filter((e) => typeof e.payload.newStrength === "number")
    .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
  const trendPoints: number[] = [];
  if (ascending.length > 0) {
    const first = ascending[0];
    if (typeof first.payload.previousStrength === "number") {
      trendPoints.push(first.payload.previousStrength);
    }
    for (const e of ascending) trendPoints.push(e.payload.newStrength as number);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">{item.name}</h3>
            {(item.role || item.organization) && (
              <p className="text-sm text-zinc-500">
                {[item.role, item.organization].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          <Metric label="Health" value={`${item.healthScore}%`} />
          <Metric label="Strength" value={`${item.relationshipStrength}%`} />
          <Metric
            label="Last contact"
            value={item.daysSinceContact === null ? "—" : `${item.daysSinceContact}d`}
          />
        </div>

        <div className="mb-5 rounded-lg border border-zinc-200 p-3">
          <p className="mb-2 text-xs font-medium text-zinc-500">Strength trend</p>
          <Sparkline points={trendPoints} />
        </div>

        <button
          onClick={onLog}
          className="mb-5 w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Log interaction
        </button>

        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
          Interaction history
        </p>
        {loading ? (
          <p className="text-sm text-zinc-400">Loading…</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-zinc-400">No interactions logged yet.</p>
        ) : (
          <ol className="space-y-3">
            {events.map((e) => (
              <li key={e.id} className="border-l-2 border-zinc-200 pl-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-800">
                    {(e.payload.type || "Note").toString().charAt(0) +
                      (e.payload.type || "Note").toString().slice(1).toLowerCase()}
                  </span>
                  {typeof e.payload.strengthDelta === "number" && e.payload.strengthDelta !== 0 && (
                    <span
                      className={`text-xs font-medium ${
                        e.payload.strengthDelta > 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {e.payload.strengthDelta > 0 ? "+" : ""}
                      {e.payload.strengthDelta}
                    </span>
                  )}
                  <span className="ml-auto text-xs text-zinc-400">
                    {new Date(e.occurredAt).toLocaleDateString()}
                  </span>
                </div>
                {e.payload.note && (
                  <p className="mt-0.5 text-sm text-zinc-600">{e.payload.note}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 px-2 py-2 text-center">
      <div className="text-[10px] uppercase tracking-wider text-zinc-400">{label}</div>
      <div className="text-sm font-semibold text-zinc-900">{value}</div>
    </div>
  );
}
