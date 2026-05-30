"use client";

import { Card, CardTitle } from "@/components/ui/Card";
import { PriorityBadge } from "@/components/ui/StatusBadge";
import type { ReasoningOutput } from "@/lib/reasoning/types";

export function RecommendationsPanel({
  reasoning,
}: {
  reasoning: ReasoningOutput & { aiInsight?: string | null };
}) {
  return (
    <div className="space-y-4">
      {reasoning.highestLeverageActions.length > 0 && (
        <Card>
          <CardTitle className="mb-3">Highest-Leverage Actions</CardTitle>
          <div className="space-y-2.5">
            {reasoning.highestLeverageActions.map((action, i) => (
              <div
                key={i}
                className="rounded-lg border border-zinc-100 bg-zinc-50 p-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <PriorityBadge priority={action.priority} />
                  <span className="text-sm font-medium text-zinc-900">
                    {action.title}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">{action.reason}</p>
                <p className="text-xs text-zinc-400 mt-1">
                  Goal: {action.relatedGoalTitle}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {reasoning.missingPrerequisites.length > 0 && (
        <Card>
          <CardTitle className="mb-3">Missing Prerequisites</CardTitle>
          <div className="space-y-2">
            {reasoning.missingPrerequisites.slice(0, 5).map((mp, i) => (
              <div key={i} className="rounded-lg bg-red-50 p-3">
                <p className="text-sm font-medium text-red-900">{mp.title}</p>
                <p className="text-xs text-red-700 mt-0.5">{mp.reason}</p>
                <p className="text-xs text-red-500 mt-1">
                  Goal: {mp.goalTitle} — Confidence: {mp.confidenceScore}%
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {reasoning.importantRelationships.length > 0 && (
        <Card>
          <CardTitle className="mb-3">Key Relationships</CardTitle>
          <div className="space-y-2">
            {reasoning.importantRelationships.slice(0, 5).map((rel, i) => (
              <div
                key={i}
                className="rounded-lg border border-zinc-100 bg-zinc-50 p-3"
              >
                <p className="text-sm font-medium text-zinc-900">
                  {rel.stakeholderName}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">{rel.reason}</p>
                {rel.linkedGoals.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {rel.linkedGoals.map((g, j) => (
                      <span
                        key={j}
                        className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-700"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {reasoning.uncertaintyReductions.length > 0 && (
        <Card>
          <CardTitle className="mb-3">Reduce Uncertainty</CardTitle>
          <div className="space-y-2">
            {reasoning.uncertaintyReductions.slice(0, 5).map((ur, i) => (
              <div key={i} className="rounded-lg bg-amber-50 p-3">
                <p className="text-sm font-medium text-amber-900">
                  {ur.question}
                </p>
                <p className="text-xs text-amber-700 mt-0.5">{ur.reason}</p>
                <p className="text-xs text-amber-600 mt-1 font-medium">
                  → {ur.suggestedAction}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {reasoning.aiInsight && (
        <Card>
          <CardTitle className="mb-3">AI Insight</CardTitle>
          <div className="prose prose-sm prose-zinc max-w-none">
            <p className="text-sm text-zinc-700 whitespace-pre-wrap">
              {reasoning.aiInsight}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
