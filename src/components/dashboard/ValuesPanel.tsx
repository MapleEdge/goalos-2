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
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

  async function reorder(fromIndex: number, toIndex: number) {
    if (!values || fromIndex === toIndex) return;
    const reordered = [...values];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    // Optimistic update
    setValues(reordered);

    // Persist new ranks
    const updates = reordered.map((v, i) =>
      fetch(`/api/values/${v.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rank: i + 1 }),
      })
    );
    await Promise.all(updates);
    refetch();
    onChanged?.();
  }

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDragLeave() {
    setDragOverIndex(null);
  }

  function handleDrop(toIndex: number) {
    if (dragIndex !== null && dragIndex !== toIndex) {
      reorder(dragIndex, toIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDragOverIndex(null);
  }

  if (values === null) return null;

  const topValues = values.slice(0, 5);
  const extraValues = values.slice(5);

  function renderRow(v: Value, index: number) {
    return (
      <div
        key={v.id}
        draggable
        onDragStart={() => handleDragStart(index)}
        onDragOver={(e) => handleDragOver(e, index)}
        onDragLeave={handleDragLeave}
        onDrop={() => handleDrop(index)}
        onDragEnd={handleDragEnd}
        className={`flex items-center gap-2 transition-opacity ${
          dragIndex === index ? "opacity-40" : ""
        } ${dragOverIndex === index && dragIndex !== index ? "relative" : ""}`}
      >
        {dragOverIndex === index && dragIndex !== null && dragIndex !== index && (
          <div className="absolute -top-0.5 left-0 right-0 h-0.5 rounded bg-violet-500" />
        )}
        <span className="w-5 flex-shrink-0 text-right text-sm font-bold text-zinc-300">
          {index + 1}
        </span>
        <div className="flex flex-1 items-center gap-1.5 rounded-lg bg-zinc-50 px-2 py-2 min-w-0">
          <div className="flex-shrink-0 cursor-grab active:cursor-grabbing text-zinc-300 hover:text-zinc-400">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="5" cy="4" r="1.2" />
              <circle cx="11" cy="4" r="1.2" />
              <circle cx="5" cy="8" r="1.2" />
              <circle cx="11" cy="8" r="1.2" />
              <circle cx="5" cy="12" r="1.2" />
              <circle cx="11" cy="12" r="1.2" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-zinc-800">{v.label}</span>
            {v.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-0.5">
                {v.tags.map((tag) => (
                  <span key={tag} className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] text-violet-600">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => removeValue(v.id)}
            className="flex-shrink-0 rounded p-0.5 text-zinc-400 hover:bg-red-100 hover:text-red-500"
            title="Remove"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

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
          {topValues.map((v, i) => renderRow(v, i))}

          {extraValues.length > 0 && !showMore && (
            <button
              onClick={() => setShowMore(true)}
              className="mt-1 w-full rounded-lg border border-dashed border-zinc-200 py-1.5 text-xs text-zinc-400 hover:border-zinc-300 hover:text-zinc-600"
            >
              +{extraValues.length} more value{extraValues.length !== 1 ? "s" : ""}
            </button>
          )}

          {showMore && extraValues.map((v, i) => renderRow(v, i + 5))}

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
