"use client";

import { useState, useRef } from "react";

interface Value {
  id: string;
  label: string;
  rank: number;
  description: string | null;
  tags: string[];
}

function useValues() {
  const [values, setValues] = useState<Value[] | null>(null);
  const fetchedRef = useRef<boolean | null>(null);

  if (fetchedRef.current === null) {
    fetchedRef.current = true;
    fetch("/api/values")
      .then((r) => r.json())
      .then((data: Value[]) => setValues(data))
      .catch(() => setValues([]));
  }

  return { values, setValues };
}

export function ValuesPanel({ onChanged }: { onChanged?: () => void }) {
  const { values, setValues } = useValues();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTags, setNewTags] = useState("");

  async function refetch() {
    const res = await fetch("/api/values");
    const data: Value[] = await res.json();
    setValues(data);
  }

  async function addValue() {
    if (!newLabel.trim() || !values) return;
    const nextRank = values.length + 1;
    await fetch("/api/values", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: newLabel.trim(),
        rank: nextRank,
        description: newDescription.trim() || null,
        tags: newTags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
      }),
    });
    setNewLabel("");
    setNewDescription("");
    setNewTags("");
    setShowAddForm(false);
    refetch();
    onChanged?.();
  }

  async function removeValue(id: string) {
    await fetch(`/api/values/${id}`, { method: "DELETE" });
    // After delete, re-rank remaining values to keep sequential
    const res = await fetch("/api/values");
    const remaining: Value[] = await res.json();
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].rank !== i + 1) {
        await fetch(`/api/values/${remaining[i].id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rank: i + 1 }),
        });
      }
    }
    refetch();
    onChanged?.();
  }

  async function moveUp(index: number) {
    if (!values || index <= 0) return;
    const current = values[index];
    const above = values[index - 1];
    // Swap ranks
    await Promise.all([
      fetch(`/api/values/${current.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rank: above.rank }),
      }),
      fetch(`/api/values/${above.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rank: current.rank }),
      }),
    ]);
    refetch();
    onChanged?.();
  }

  async function moveDown(index: number) {
    if (!values || index >= values.length - 1) return;
    const current = values[index];
    const below = values[index + 1];
    await Promise.all([
      fetch(`/api/values/${current.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rank: below.rank }),
      }),
      fetch(`/api/values/${below.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rank: current.rank }),
      }),
    ]);
    refetch();
    onChanged?.();
  }

  if (values === null) return null;

  const topValues = values.slice(0, 5);
  const extraValues = values.slice(5);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider">
          My Values
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-xs text-zinc-500 hover:text-zinc-700"
        >
          {showAddForm ? "Cancel" : "+ Add Value"}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-3 space-y-2 rounded-lg border border-dashed border-zinc-300 p-3">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Value (e.g., Financial Security)"
            className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
          />
          <input
            type="text"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
          />
          <input
            type="text"
            value={newTags}
            onChange={(e) => setNewTags(e.target.value)}
            placeholder="Tags (comma-separated: money, career, wealth)"
            className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
          />
          <button
            onClick={addValue}
            disabled={!newLabel.trim()}
            className="w-full rounded bg-zinc-800 px-3 py-1.5 text-xs text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            Add Value
          </button>
        </div>
      )}

      {values.length === 0 ? (
        <p className="text-xs text-zinc-400 py-2">
          No values defined yet. Add values to get personalized goal suggestions.
        </p>
      ) : (
        <div className="space-y-1.5">
          {topValues.map((v, i) => (
            <ValueRow
              key={v.id}
              value={v}
              position={i + 1}
              isFirst={i === 0}
              isLast={i === values.length - 1}
              onMoveUp={() => moveUp(i)}
              onMoveDown={() => moveDown(i)}
              onRemove={() => removeValue(v.id)}
            />
          ))}

          {extraValues.length > 0 && !showMore && (
            <button
              onClick={() => setShowMore(true)}
              className="mt-1 w-full rounded-lg border border-dashed border-zinc-200 py-1.5 text-xs text-zinc-400 hover:border-zinc-300 hover:text-zinc-600"
            >
              +{extraValues.length} more value{extraValues.length !== 1 ? "s" : ""}
            </button>
          )}

          {showMore && extraValues.map((v, i) => (
            <ValueRow
              key={v.id}
              value={v}
              position={i + 6}
              isFirst={false}
              isLast={i + 5 === values.length - 1}
              onMoveUp={() => moveUp(i + 5)}
              onMoveDown={() => moveDown(i + 5)}
              onRemove={() => removeValue(v.id)}
            />
          ))}

          {showMore && (
            <button
              onClick={() => setShowMore(false)}
              className="mt-1 w-full text-xs text-zinc-400 hover:text-zinc-600"
            >
              Show less
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ValueRow({
  value,
  position,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  value: Value;
  position: number;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-5 flex-shrink-0 text-right text-sm font-bold text-zinc-300">
        {position}
      </span>
      <div className="flex flex-1 items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 min-w-0">
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-zinc-800">{value.label}</span>
          {value.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {value.tags.map((tag) => (
                <span key={tag} className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] text-violet-600">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="rounded p-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 disabled:opacity-20 disabled:hover:bg-transparent"
            title="Move up"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 10l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="rounded p-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 disabled:opacity-20 disabled:hover:bg-transparent"
            title="Move down"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={onRemove}
            className="rounded p-0.5 text-zinc-400 hover:bg-red-100 hover:text-red-500"
            title="Remove"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
