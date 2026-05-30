"use client";

import { useState } from "react";

export function AddStakeholderModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [role, setRole] = useState("");
  const [strength, setStrength] = useState(50);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stakeholders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          organization: organization.trim() || null,
          role: role.trim() || null,
          relationshipStrength: strength,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Add stakeholder failed:", data);
        setError(data?.error || "Couldn't add stakeholder. Please try again.");
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error("Add stakeholder error:", err);
      setError("Network error. Please try again.");
      setLoading(false);
      return;
    }
    setLoading(false);
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-800">Add stakeholder</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        <label className="mb-1.5 block text-xs font-medium text-zinc-500">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Jordan Lee"
          className="mb-3 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />

        <div className="mb-3 flex gap-3">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium text-zinc-500">Organization</label>
            <input
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="e.g. Acme Inc"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium text-zinc-500">Role</label>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Investor"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            />
          </div>
        </div>

        <label className="mb-1.5 block text-xs font-medium text-zinc-500">
          Starting relationship strength: {strength}%
        </label>
        <input
          type="range"
          min={0}
          max={100}
          value={strength}
          onChange={(e) => setStrength(Number(e.target.value))}
          className="mb-3 w-full accent-pink-500"
        />

        <label className="mb-1.5 block text-xs font-medium text-zinc-500">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Context, how you met, what they care about…"
          rows={2}
          className="mb-4 w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />

        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading || !name.trim()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {loading ? "Adding…" : "Add stakeholder"}
          </button>
        </div>
      </div>
    </div>
  );
}
