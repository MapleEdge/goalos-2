"use client";

import { useState, useEffect, useCallback } from "react";

interface GoalSuggestion {
  title: string;
  description: string;
  reasoning: string;
  alignedValues: string[];
  priority: "HIGH" | "MEDIUM" | "LOW";
}

interface SuggestionsResponse {
  suggestions: GoalSuggestion[];
  valuesSummary?: string;
  message?: string;
}

export function SuggestedGoals({
  refreshKey,
  onCreateGoal,
}: {
  refreshKey: number;
  onCreateGoal: (title: string, description: string) => void;
}) {
  const [data, setData] = useState<SuggestionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissedTitles, setDismissedTitles] = useState<Set<string>>(new Set());

  const fetchSuggestions = useCallback(() => {
    let cancelled = false;
    fetch("/api/goals/suggest")
      .then((r) => r.json())
      .then((d: SuggestionsResponse) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    return fetchSuggestions();
  }, [refreshKey, fetchSuggestions]);

  if (loading) return null;
  if (!data || data.suggestions.length === 0) {
    if (data?.message) {
      return (
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-2">
            Suggested Next Goals
          </h3>
          <p className="text-xs text-zinc-400">{data.message}</p>
        </div>
      );
    }
    return null;
  }

  const visible = data.suggestions.filter((s) => !dismissedTitles.has(s.title));
  if (visible.length === 0) return null;

  const priorityColor = { HIGH: "bg-red-100 text-red-700", MEDIUM: "bg-amber-100 text-amber-700", LOW: "bg-zinc-100 text-zinc-600" };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-3">
        Suggested Next Goals
      </h3>
      <p className="text-xs text-zinc-400 mb-3">
        Based on your values: {data.valuesSummary}
      </p>
      <div className="space-y-3">
        {visible.slice(0, 5).map((s) => (
          <div key={s.title} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${priorityColor[s.priority]}`}>
                    {s.priority}
                  </span>
                  <span className="text-sm font-medium text-zinc-800">{s.title}</span>
                </div>
                <p className="text-xs text-zinc-500 mb-1">{s.description}</p>
                <p className="text-[11px] text-zinc-400 italic">{s.reasoning}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {s.alignedValues.map((v) => (
                    <span key={v} className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] text-violet-600">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => onCreateGoal(s.title, s.description)}
                  className="rounded bg-zinc-800 px-2 py-1 text-xs text-white hover:bg-zinc-700"
                >
                  Create
                </button>
                <button
                  onClick={() => setDismissedTitles((prev) => new Set(prev).add(s.title))}
                  className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
