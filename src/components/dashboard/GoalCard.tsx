"use client";

import { Card, CardTitle } from "@/components/ui/Card";
import { StatusBadge, PriorityBadge } from "@/components/ui/StatusBadge";
import { ReadinessGauge } from "@/components/ui/ReadinessGauge";
import type { ReadinessScore } from "@/lib/reasoning/types";

interface Prerequisite {
  id: string;
  title: string;
  status: string;
  confidenceScore: number;
}

interface Action {
  id: string;
  title: string;
  status: string;
  priority: string;
}

interface Goal {
  id: string;
  title: string;
  description: string | null;
  status: string;
  targetDate: string | null;
  prerequisites: Prerequisite[];
  actions: Action[];
}

export function GoalCard({
  goal,
  readiness,
}: {
  goal: Goal;
  readiness?: ReadinessScore;
}) {
  const completedPrereqs = goal.prerequisites.filter(
    (p) => p.status === "COMPLETED"
  ).length;
  const pendingActions = goal.actions.filter(
    (a) => a.status !== "DONE" && a.status !== "SKIPPED"
  ).length;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <CardTitle>{goal.title}</CardTitle>
            <StatusBadge status={goal.status} />
          </div>
          {goal.description && (
            <p className="text-xs text-zinc-500 line-clamp-2 mb-3">
              {goal.description}
            </p>
          )}
        </div>
        {readiness && <ReadinessGauge score={readiness.score} size="md" />}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
        <span>
          {completedPrereqs}/{goal.prerequisites.length} prerequisites met
        </span>
        <span>{pendingActions} pending action(s)</span>
        {goal.targetDate && (
          <span>
            Target:{" "}
            {new Date(goal.targetDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        )}
      </div>

      {goal.prerequisites.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-xs font-medium text-zinc-700">Prerequisites</p>
          {goal.prerequisites.slice(0, 4).map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-xs">
              <StatusBadge status={p.status} />
              <span className="truncate text-zinc-600">{p.title}</span>
              <span className="ml-auto text-zinc-400 tabular-nums">
                {p.confidenceScore}%
              </span>
            </div>
          ))}
          {goal.prerequisites.length > 4 && (
            <p className="text-xs text-zinc-400">
              +{goal.prerequisites.length - 4} more
            </p>
          )}
        </div>
      )}

      {goal.actions.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-xs font-medium text-zinc-700">Actions</p>
          {goal.actions.slice(0, 3).map((a) => (
            <div key={a.id} className="flex items-center gap-2 text-xs">
              <PriorityBadge priority={a.priority} />
              <span className="truncate text-zinc-600">{a.title}</span>
              <StatusBadge status={a.status} />
            </div>
          ))}
        </div>
      )}

      {readiness && readiness.missingItems.length > 0 && (
        <div className="mt-3 rounded-lg bg-amber-50 p-2.5">
          <p className="text-xs font-medium text-amber-800">
            {readiness.recommendedAction}
          </p>
        </div>
      )}
    </Card>
  );
}
