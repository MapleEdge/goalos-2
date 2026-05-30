"use client";

const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  PAUSED: "bg-amber-100 text-amber-800",
  ABANDONED: "bg-zinc-100 text-zinc-500",
  NOT_STARTED: "bg-zinc-100 text-zinc-600",
  IN_PROGRESS: "bg-sky-100 text-sky-800",
  BLOCKED: "bg-red-100 text-red-800",
  TODO: "bg-zinc-100 text-zinc-600",
  DONE: "bg-emerald-100 text-emerald-800",
  SKIPPED: "bg-zinc-100 text-zinc-400",
};

const priorityColors: Record<string, string> = {
  LOW: "bg-zinc-100 text-zinc-600",
  MEDIUM: "bg-sky-100 text-sky-700",
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: string }) {
  const color = statusColors[status] || "bg-zinc-100 text-zinc-600";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const color = priorityColors[priority] || "bg-zinc-100 text-zinc-600";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}
    >
      {priority}
    </span>
  );
}
