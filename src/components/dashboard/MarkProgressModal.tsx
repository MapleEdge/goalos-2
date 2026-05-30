"use client";

import { useState } from "react";

interface Goal {
  id: string;
  title: string;
  status: string;
  prerequisites: { id: string; title: string; status: string }[];
  actions: { id: string; title: string; status: string; priority: string }[];
}

type Tab = "action" | "evidence" | "note" | "status";

export function MarkProgressModal({
  goal,
  onClose,
  onDone,
}: {
  goal: Goal;
  onClose: () => void;
  onDone: () => void;
}) {
  const [tab, setTab] = useState<Tab>("action");
  const [loading, setLoading] = useState(false);

  // Action tab
  const pendingActions = goal.actions.filter((a) => a.status === "TODO" || a.status === "IN_PROGRESS");

  // Evidence tab
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceDesc, setEvidenceDesc] = useState("");
  const [evidenceSource, setEvidenceSource] = useState("");
  const [evidencePrereqId, setEvidencePrereqId] = useState("");

  // Note tab
  const [note, setNote] = useState("");

  // Status tab
  const [newStatus, setNewStatus] = useState(goal.status);

  async function submit(action: string, body: Record<string, unknown>) {
    setLoading(true);
    await fetch(`/api/goals/${goal.id}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    });
    setLoading(false);
    onDone();
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "action", label: "Complete Action" },
    { key: "evidence", label: "Add Evidence" },
    { key: "note", label: "Add Note" },
    { key: "status", label: "Change Status" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-800">
            Mark Progress — {goal.title}
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        <div className="flex gap-1 mb-4 rounded-lg bg-zinc-100 p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                tab === t.key
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Complete Action */}
        {tab === "action" && (
          <div className="space-y-2">
            {pendingActions.length === 0 ? (
              <p className="text-xs text-zinc-400 py-4 text-center">No pending actions</p>
            ) : (
              pendingActions.map((a) => (
                <button
                  key={a.id}
                  onClick={() => submit("complete_action", { actionId: a.id })}
                  disabled={loading}
                  className="w-full flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2.5 text-left hover:bg-zinc-50 disabled:opacity-50"
                >
                  <span className="h-4 w-4 rounded border-2 border-zinc-300 flex-shrink-0" />
                  <span className="text-sm text-zinc-700 truncate">{a.title}</span>
                  <span className={`ml-auto text-[10px] font-medium rounded-full px-1.5 py-0.5 ${
                    a.priority === "CRITICAL" ? "bg-red-100 text-red-700" :
                    a.priority === "HIGH" ? "bg-orange-100 text-orange-700" :
                    "bg-zinc-100 text-zinc-500"
                  }`}>
                    {a.priority}
                  </span>
                </button>
              ))
            )}
          </div>
        )}

        {/* Add Evidence */}
        {tab === "evidence" && (
          <div className="space-y-3">
            <input
              type="text"
              value={evidenceTitle}
              onChange={(e) => setEvidenceTitle(e.target.value)}
              placeholder="What happened?"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            />
            <textarea
              value={evidenceDesc}
              onChange={(e) => setEvidenceDesc(e.target.value)}
              placeholder="Details (optional)"
              rows={2}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none resize-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={evidenceSource}
                onChange={(e) => setEvidenceSource(e.target.value)}
                placeholder="Source (meeting, email...)"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
              />
              <select
                value={evidencePrereqId}
                onChange={(e) => setEvidencePrereqId(e.target.value)}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
              >
                <option value="">Link to prerequisite...</option>
                {goal.prerequisites.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => submit("add_evidence", {
                title: evidenceTitle,
                description: evidenceDesc || null,
                source: evidenceSource || null,
                prerequisiteId: evidencePrereqId || null,
              })}
              disabled={loading || !evidenceTitle.trim()}
              className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              Add Evidence
            </button>
          </div>
        )}

        {/* Add Note */}
        {tab === "note" && (
          <div className="space-y-3">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What's on your mind about this goal?"
              rows={4}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none resize-none"
            />
            <button
              onClick={() => submit("add_note", { note })}
              disabled={loading || !note.trim()}
              className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              Save Note
            </button>
          </div>
        )}

        {/* Change Status */}
        {tab === "status" && (
          <div className="space-y-3">
            {(["ACTIVE", "BLOCKED", "WAITING", "COMPLETED", "ARCHIVED"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setNewStatus(s)}
                className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  newStatus === s
                    ? "border-zinc-900 bg-zinc-50"
                    : "border-zinc-200 hover:bg-zinc-50"
                }`}
              >
                <span className={`h-3 w-3 rounded-full flex-shrink-0 ${
                  s === "ACTIVE" ? "bg-emerald-500" :
                  s === "BLOCKED" ? "bg-red-500" :
                  s === "WAITING" ? "bg-amber-500" :
                  s === "COMPLETED" ? "bg-blue-500" :
                  "bg-zinc-400"
                }`} />
                <span className="text-sm text-zinc-700 font-medium">{s.replace(/_/g, " ")}</span>
                {s === "COMPLETED" && <span className="text-xs text-zinc-400 ml-auto">Records completion date</span>}
              </button>
            ))}
            <button
              onClick={() => submit("change_status", { status: newStatus })}
              disabled={loading || newStatus === goal.status}
              className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              Update Status
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
