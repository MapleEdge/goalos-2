import { prisma } from "@/lib/prisma";
import type {
  ReasoningOutput,
  RecommendedAction,
  MissingPrerequisite,
  ImportantRelationship,
  UncertaintyReduction,
  ReadinessScore,
} from "./types";

export async function generateRecommendations(): Promise<ReasoningOutput> {
  const [goals, stakeholders, prerequisites, evidence, actions, relationships] =
    await Promise.all([
      prisma.goal.findMany({
        where: { status: "ACTIVE" },
        include: {
          prerequisites: { include: { evidence: true } },
          actions: true,
        },
      }),
      prisma.stakeholder.findMany({ include: { evidence: true } }),
      prisma.prerequisite.findMany({ include: { evidence: true, goal: true } }),
      prisma.evidence.findMany({
        include: { stakeholder: true, prerequisite: true },
      }),
      prisma.action.findMany({ include: { goal: true } }),
      prisma.relationship.findMany(),
    ]);

  const highestLeverageActions = computeHighestLeverageActions(
    goals,
    actions,
    prerequisites
  );
  const missingPrerequisites = computeMissingPrerequisites(
    goals,
    prerequisites
  );
  const importantRelationships = computeImportantRelationships(
    goals,
    stakeholders,
    relationships
  );
  const uncertaintyReductions = computeUncertaintyReductions(
    goals,
    prerequisites,
    evidence
  );
  const readinessScores = computeReadinessScores(goals, prerequisites);

  return {
    highestLeverageActions,
    missingPrerequisites,
    importantRelationships,
    uncertaintyReductions,
    readinessScores,
    generatedAt: new Date().toISOString(),
  };
}

type GoalWithRelations = Awaited<
  ReturnType<typeof prisma.goal.findMany<{
    include: {
      prerequisites: { include: { evidence: true } };
      actions: true;
    };
  }>>
>[number];

type ActionWithGoal = Awaited<
  ReturnType<typeof prisma.action.findMany<{ include: { goal: true } }>>
>[number];

type PrereqWithRelations = Awaited<
  ReturnType<typeof prisma.prerequisite.findMany<{
    include: { evidence: true; goal: true };
  }>>
>[number];

type StakeholderWithEvidence = Awaited<
  ReturnType<typeof prisma.stakeholder.findMany<{ include: { evidence: true } }>>
>[number];

type EvidenceWithRelations = Awaited<
  ReturnType<typeof prisma.evidence.findMany<{
    include: { stakeholder: true; prerequisite: true };
  }>>
>[number];

type RelationshipRow = Awaited<
  ReturnType<typeof prisma.relationship.findMany>
>[number];

function computeHighestLeverageActions(
  goals: GoalWithRelations[],
  actions: ActionWithGoal[],
  _prerequisites: PrereqWithRelations[]
): RecommendedAction[] {
  const results: RecommendedAction[] = [];

  for (const goal of goals) {
    const blockedPrereqs = goal.prerequisites.filter(
      (p) => p.status !== "COMPLETED"
    );
    const pendingActions = actions.filter(
      (a) => a.goalId === goal.id && a.status !== "DONE" && a.status !== "SKIPPED"
    );

    // Highest leverage: actions tied to goals with the most incomplete prerequisites
    for (const action of pendingActions) {
      const _leverage = blockedPrereqs.length > 0 ? blockedPrereqs.length : 1;
      void _leverage;
      results.push({
        title: action.title,
        reason: blockedPrereqs.length > 0
          ? `Unblocks ${blockedPrereqs.length} prerequisite(s) for "${goal.title}"`
          : `Advances "${goal.title}" directly`,
        priority: action.priority,
        relatedGoalId: goal.id,
        relatedGoalTitle: goal.title,
      });
    }

    // If no actions exist but prereqs are blocked, suggest creating actions
    if (pendingActions.length === 0 && blockedPrereqs.length > 0) {
      const topBlocker = blockedPrereqs.sort(
        (a, b) => a.confidenceScore - b.confidenceScore
      )[0];
      results.push({
        title: `Address prerequisite: ${topBlocker.title}`,
        reason: `Lowest confidence prerequisite (${topBlocker.confidenceScore}%) blocking "${goal.title}"`,
        priority: "HIGH",
        relatedGoalId: goal.id,
        relatedGoalTitle: goal.title,
      });
    }
  }

  return results
    .sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority))
    .slice(0, 10);
}

function computeMissingPrerequisites(
  goals: GoalWithRelations[],
  _prerequisites: PrereqWithRelations[]
): MissingPrerequisite[] {
  const results: MissingPrerequisite[] = [];

  for (const goal of goals) {
    for (const prereq of goal.prerequisites) {
      if (prereq.status === "COMPLETED") continue;
      const evidenceCount = prereq.evidence.length;
      results.push({
        title: prereq.title,
        reason: evidenceCount === 0
          ? `No evidence collected yet — this prerequisite is unvalidated`
          : `Only ${evidenceCount} piece(s) of evidence — confidence at ${prereq.confidenceScore}%`,
        goalId: goal.id,
        goalTitle: goal.title,
        confidenceScore: prereq.confidenceScore,
      });
    }
  }

  return results.sort((a, b) => a.confidenceScore - b.confidenceScore);
}

function computeImportantRelationships(
  goals: GoalWithRelations[],
  stakeholders: StakeholderWithEvidence[],
  relationships: RelationshipRow[]
): ImportantRelationship[] {
  const stakeholderGoalLinks = new Map<string, Set<string>>();

  for (const rel of relationships) {
    if (rel.fromType === "STAKEHOLDER" && rel.toType === "GOAL") {
      const links = stakeholderGoalLinks.get(rel.fromId) || new Set();
      const goal = goals.find((g) => g.id === rel.toId);
      if (goal) links.add(goal.title);
      stakeholderGoalLinks.set(rel.fromId, links);
    }
    if (rel.toType === "STAKEHOLDER" && rel.fromType === "GOAL") {
      const links = stakeholderGoalLinks.get(rel.toId) || new Set();
      const goal = goals.find((g) => g.id === rel.fromId);
      if (goal) links.add(goal.title);
      stakeholderGoalLinks.set(rel.toId, links);
    }
  }

  return stakeholders
    .map((s) => {
      const linkedGoals = Array.from(stakeholderGoalLinks.get(s.id) || []);
      const daysSinceContact = s.lastInteraction
        ? Math.floor(
            (Date.now() - s.lastInteraction.getTime()) / (1000 * 60 * 60 * 24)
          )
        : null;

      let reason = "";
      if (linkedGoals.length > 0) {
        reason = `Connected to ${linkedGoals.length} active goal(s)`;
        if (daysSinceContact !== null && daysSinceContact > 14) {
          reason += ` — last contact ${daysSinceContact} days ago (follow up recommended)`;
        }
      } else {
        reason = `High relationship strength (${s.relationshipStrength}%) but not yet linked to any goal`;
      }

      return {
        stakeholderName: s.name,
        stakeholderId: s.id,
        reason,
        linkedGoals,
      };
    })
    .sort(
      (a, b) => b.linkedGoals.length - a.linkedGoals.length
    )
    .slice(0, 10);
}

function computeUncertaintyReductions(
  goals: GoalWithRelations[],
  prerequisites: PrereqWithRelations[],
  _evidence: EvidenceWithRelations[]
): UncertaintyReduction[] {
  const results: UncertaintyReduction[] = [];

  for (const goal of goals) {
    const lowConfidencePrereqs = goal.prerequisites.filter(
      (p) => p.confidenceScore < 50 && p.status !== "COMPLETED"
    );

    for (const prereq of lowConfidencePrereqs) {
      results.push({
        question: `How confident are you that "${prereq.title}" can be achieved?`,
        reason: `Current confidence is only ${prereq.confidenceScore}% — validating this would clarify whether "${goal.title}" is on track`,
        suggestedAction: prereq.evidence.length === 0
          ? `Gather initial evidence for "${prereq.title}"`
          : `Seek additional validation beyond the ${prereq.evidence.length} existing evidence item(s)`,
      });
    }
  }

  return results.slice(0, 10);
}

function computeReadinessScores(
  goals: GoalWithRelations[],
  _prerequisites: PrereqWithRelations[]
): ReadinessScore[] {
  return goals.map((goal) => {
    const totalPrereqs = goal.prerequisites.length;
    if (totalPrereqs === 0) {
      return {
        goalId: goal.id,
        goalTitle: goal.title,
        score: 50,
        supportingEvidence: [],
        missingItems: ["No prerequisites defined — add prerequisites to track readiness"],
        recommendedAction: "Define the key prerequisites needed to achieve this goal",
      };
    }

    const completedPrereqs = goal.prerequisites.filter(
      (p) => p.status === "COMPLETED"
    );
    const incompletePrereqs = goal.prerequisites.filter(
      (p) => p.status !== "COMPLETED"
    );

    const completionRatio = completedPrereqs.length / totalPrereqs;
    const avgConfidence =
      goal.prerequisites.reduce((sum, p) => sum + p.confidenceScore, 0) /
      totalPrereqs;

    // Readiness = 60% completion ratio + 40% average confidence
    const score = Math.round(completionRatio * 60 + (avgConfidence / 100) * 40);

    const supportingEvidence = completedPrereqs.map((p) => p.title);
    const missingItems = incompletePrereqs.map(
      (p) => `${p.title} (${p.confidenceScore}% confidence)`
    );

    let recommendedAction: string;
    if (incompletePrereqs.length > 0) {
      const lowestConfidence = incompletePrereqs.sort(
        (a, b) => a.confidenceScore - b.confidenceScore
      )[0];
      recommendedAction = `Focus on: ${lowestConfidence.title}`;
    } else {
      recommendedAction = "All prerequisites met — ready to proceed";
    }

    return {
      goalId: goal.id,
      goalTitle: goal.title,
      score,
      supportingEvidence,
      missingItems,
      recommendedAction,
    };
  });
}

function priorityWeight(p: string): number {
  switch (p) {
    case "CRITICAL": return 4;
    case "HIGH": return 3;
    case "MEDIUM": return 2;
    case "LOW": return 1;
    default: return 0;
  }
}
