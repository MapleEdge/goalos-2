export interface RecommendedAction {
  title: string;
  reason: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  relatedGoalId: string;
  relatedGoalTitle: string;
}

export interface MissingPrerequisite {
  title: string;
  reason: string;
  goalId: string;
  goalTitle: string;
  confidenceScore: number;
}

export interface ImportantRelationship {
  stakeholderName: string;
  stakeholderId: string;
  reason: string;
  linkedGoals: string[];
}

export interface UncertaintyReduction {
  question: string;
  reason: string;
  suggestedAction: string;
}

export interface ReadinessScore {
  goalId: string;
  goalTitle: string;
  score: number; // 0-100
  supportingEvidence: string[];
  missingItems: string[];
  recommendedAction: string;
}

export interface ReasoningOutput {
  highestLeverageActions: RecommendedAction[];
  missingPrerequisites: MissingPrerequisite[];
  importantRelationships: ImportantRelationship[];
  uncertaintyReductions: UncertaintyReduction[];
  readinessScores: ReadinessScore[];
  generatedAt: string;
}
