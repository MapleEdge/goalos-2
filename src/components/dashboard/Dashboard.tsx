"use client";

import { useEffect, useState } from "react";
import { GoalCard } from "./GoalCard";
import { RecommendationsPanel } from "./RecommendationsPanel";
import { CreateGoalForm } from "./CreateGoalForm";
import { ValuesPanel } from "./ValuesPanel";
import { SuggestedGoals } from "./SuggestedGoals";
import { Modal } from "@/components/ui/Modal";
import type { ReasoningOutput, ReadinessScore } from "@/lib/reasoning/types";

interface GoalData {
  id: string;
  title: string;
  description: string | null;
  status: string;
  targetDate: string | null;
  prerequisites: {
    id: string;
    title: string;
    status: string;
    confidenceScore: number;
  }[];
  actions: {
    id: string;
    title: string;
    status: string;
    priority: string;
  }[];
}

async function fetchGoals(): Promise<GoalData[]> {
  const res = await fetch("/api/goals");
  return res.json();
}

async function fetchReasoning(): Promise<
  ReasoningOutput & { aiInsight?: string | null }
> {
  const res = await fetch("/api/reasoning");
  return res.json();
}

export function Dashboard() {
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [reasoning, setReasoning] = useState<
    (ReasoningOutput & { aiInsight?: string | null }) | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [suggestRefreshKey, setSuggestRefreshKey] = useState(0);
  const [prefillTitle, setPrefillTitle] = useState("");
  const [prefillDescription, setPrefillDescription] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [goalsData, reasoningData] = await Promise.all([
        fetchGoals(),
        fetchReasoning(),
      ]);
      if (!cancelled) {
        setGoals(goalsData);
        setReasoning(reasoningData);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  function getReadiness(goalId: string): ReadinessScore | undefined {
    return reasoning?.readinessScores.find((r) => r.goalId === goalId);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-800" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
          <p className="text-sm text-zinc-500">
            {goals.length} active goal{goals.length !== 1 ? "s" : ""} tracked
          </p>
        </div>
        <button
          onClick={() => setShowCreateGoal(true)}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          + New Goal
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-zinc-200 p-12 text-center">
          <h2 className="text-lg font-semibold text-zinc-700 mb-2">
            No goals yet
          </h2>
          <p className="text-sm text-zinc-500 mb-4">
            Define your first goal to start building your state graph.
          </p>
          <button
            onClick={() => setShowCreateGoal(true)}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Create Goal
          </button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider">
              Goals
            </h2>
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                readiness={getReadiness(goal.id)}
              />
            ))}
          </div>
          <div className="space-y-4">
            <ValuesPanel onChanged={() => setSuggestRefreshKey((k) => k + 1)} />
            <SuggestedGoals
              refreshKey={suggestRefreshKey}
              onCreateGoal={(title, description) => {
                setPrefillTitle(title);
                setPrefillDescription(description);
                setShowCreateGoal(true);
              }}
            />
            <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider">
              Recommendations
            </h2>
            {reasoning && <RecommendationsPanel reasoning={reasoning} />}
          </div>
        </div>
      )}

      <Modal
        open={showCreateGoal}
        onClose={() => setShowCreateGoal(false)}
        title="Create New Goal"
      >
        <CreateGoalForm
          key={`${prefillTitle}-${prefillDescription}`}
          onCreated={() => {
            setShowCreateGoal(false);
            setPrefillTitle("");
            setPrefillDescription("");
            setRefreshKey((k) => k + 1);
            setSuggestRefreshKey((k) => k + 1);
          }}
          onCancel={() => {
            setShowCreateGoal(false);
            setPrefillTitle("");
            setPrefillDescription("");
          }}
          initialTitle={prefillTitle}
          initialDescription={prefillDescription}
        />
      </Modal>
    </div>
  );
}
