import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

interface ValueRow {
  id: string;
  label: string;
  rank: number;
  description: string | null;
  tags: string[];
}

interface GoalSuggestion {
  title: string;
  description: string;
  reasoning: string;
  alignedValues: string[];
  priority: "HIGH" | "MEDIUM" | "LOW";
}

// --- Gemini integration via OpenAI-compatible endpoint ---

function getGeminiClient(): OpenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  });
}

async function generateWithGemini(
  values: ValueRow[],
  existingGoals: { title: string; description: string | null; status: string; completedAt: Date | null }[]
): Promise<GoalSuggestion[] | null> {
  const client = getGeminiClient();
  if (!client) return null;

  const activeGoals = existingGoals.filter((g) => g.status === "ACTIVE");
  const completedGoals = existingGoals.filter((g) => g.status === "COMPLETED");

  const valuesContext = values
    .map((v) => `- ${v.label} (rank #${v.rank}, tags: ${v.tags.join(", ")})${v.description ? `: ${v.description}` : ""}`)
    .join("\n");

  const activeContext = activeGoals.length > 0
    ? activeGoals.map((g) => `- ${g.title}: ${g.description || ""}`).join("\n")
    : "No active goals yet.";

  const completedContext = completedGoals.length > 0
    ? completedGoals.map((g) => `- ${g.title}: ${g.description || ""}`).join("\n")
    : "No completed goals yet.";

  const systemPrompt = `You are a strategic life coach. Given a user's personal values (ranked by importance), their completed goals, and their current active/in-progress goals, suggest 5-8 new goals they should consider pursuing.

Rules:
- Do NOT suggest goals that duplicate or closely overlap existing active goals.
- Build on completed goals — suggest logical next steps, deeper challenges, or extensions of past achievements.
- Reference completed goals in your reasoning when relevant (e.g., "Since you completed X, you're ready for Y").
- Consider active goals to avoid overlap but also suggest goals that complement or synergize with them.
- Each suggestion should clearly align with one or more of their values.
- Prioritize underserved values (values with no active goals covering them).
- Higher-ranked values deserve higher priority suggestions.
- Be specific and actionable — avoid vague goals.
- Assign priority: HIGH for rank 1-2 values, MEDIUM for rank 3-4, LOW for rank 5+.
- Order the suggestions by priority: all HIGH first, then MEDIUM, then LOW.

Respond with ONLY a valid JSON array of objects, no markdown, no explanation. Each object must have:
{
  "title": "short goal title",
  "description": "one-sentence description of the goal",
  "reasoning": "why this goal matters given their values and history",
  "alignedValues": ["Value Label 1"],
  "priority": "HIGH" | "MEDIUM" | "LOW"
}`;

  const userPrompt = `My values (ranked by importance):
${valuesContext}

My completed goals:
${completedContext}

My current active goals:
${activeContext}

Suggest new goals I should pursue, building on what I've already accomplished.`;

  try {
    const completion = await client.chat.completions.create({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 4000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return null;

    // Strip markdown code fences if present
    const cleaned = content.replace(/```(?:json)?\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned) as GoalSuggestion[];

    if (!Array.isArray(parsed)) return null;

    // Validate each suggestion has the required fields
    const valid = parsed.filter(
      (s) =>
        typeof s.title === "string" &&
        typeof s.description === "string" &&
        typeof s.reasoning === "string" &&
        Array.isArray(s.alignedValues) &&
        ["HIGH", "MEDIUM", "LOW"].includes(s.priority)
    );

    // Sort by priority (HIGH first, then MEDIUM, then LOW)
    const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    valid.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    return valid.length > 0 ? valid.slice(0, 8) : null;
  } catch {
    return null;
  }
}

// --- Template-based fallback ---

const GOAL_TEMPLATES: Record<string, { title: string; description: string; tags: string[] }[]> = {
  money: [
    { title: "Build emergency fund", description: "Save 6 months of living expenses in a high-yield savings account", tags: ["money", "finance", "saving"] },
    { title: "Create passive income stream", description: "Develop a source of recurring revenue that doesn't require active work", tags: ["money", "income", "investing"] },
    { title: "Increase annual income by 20%", description: "Negotiate a raise, switch roles, or add a revenue-generating side project", tags: ["money", "career", "income"] },
    { title: "Start investment portfolio", description: "Open a brokerage account and begin dollar-cost averaging into diversified funds", tags: ["money", "investing", "wealth"] },
  ],
  career: [
    { title: "Get promoted to next level", description: "Achieve the next career milestone by demonstrating leadership and impact", tags: ["career", "growth", "leadership"] },
    { title: "Build industry expertise", description: "Become a recognized expert in your domain through publishing and speaking", tags: ["career", "expertise", "reputation"] },
    { title: "Expand professional network", description: "Build meaningful connections with 20 new people in your industry", tags: ["career", "network", "relationships"] },
  ],
  education: [
    { title: "Complete a certification", description: "Earn a professional certification that advances career credentials", tags: ["education", "career", "skills"] },
    { title: "Learn a new technical skill", description: "Achieve proficiency in a new technology or methodology", tags: ["education", "skills", "growth"] },
    { title: "Complete university degree", description: "Graduate with honors from your degree program", tags: ["education", "degree", "academic"] },
  ],
  health: [
    { title: "Establish consistent exercise routine", description: "Work out at least 4 times per week for 3 months", tags: ["health", "fitness", "discipline"] },
    { title: "Improve nutrition habits", description: "Plan and prepare healthy meals consistently, reduce processed food intake", tags: ["health", "nutrition", "wellness"] },
    { title: "Complete a physical challenge", description: "Train for and complete a marathon, triathlon, or similar endurance event", tags: ["health", "fitness", "achievement"] },
  ],
  relationships: [
    { title: "Deepen key relationships", description: "Schedule regular quality time with the 5 most important people in your life", tags: ["relationships", "family", "connection"] },
    { title: "Resolve a strained relationship", description: "Address conflict or distance in an important relationship through open communication", tags: ["relationships", "growth", "emotional"] },
    { title: "Find a life partner", description: "Actively invest time in meeting potential partners and building genuine connections", tags: ["relationships", "romantic", "love"] },
  ],
  creative: [
    { title: "Complete a creative project", description: "Finish and share a meaningful creative work (book, album, art series, etc.)", tags: ["creative", "expression", "achievement"] },
    { title: "Develop a creative habit", description: "Dedicate time daily to creative practice and skill development", tags: ["creative", "discipline", "growth"] },
  ],
  impact: [
    { title: "Mentor someone", description: "Commit to regularly mentoring someone who could benefit from your experience", tags: ["impact", "mentorship", "giving"] },
    { title: "Launch a community initiative", description: "Start or lead a project that benefits your local or professional community", tags: ["impact", "community", "leadership"] },
    { title: "Contribute to open source", description: "Make meaningful contributions to open-source projects in your field", tags: ["impact", "tech", "community"] },
  ],
  wealth: [
    { title: "Achieve financial independence", description: "Build enough passive income or savings to cover all living expenses", tags: ["wealth", "freedom", "investing"] },
    { title: "Diversify income sources", description: "Create at least 3 distinct sources of income", tags: ["wealth", "income", "security"] },
  ],
  freedom: [
    { title: "Achieve location independence", description: "Structure work and life to be able to live and work from anywhere", tags: ["freedom", "remote", "lifestyle"] },
    { title: "Reduce financial obligations", description: "Pay off debts and reduce fixed costs to increase flexibility", tags: ["freedom", "finance", "simplicity"] },
  ],
  family: [
    { title: "Plan a family milestone", description: "Organize a significant family event or tradition", tags: ["family", "relationships", "traditions"] },
    { title: "Support a family member's goal", description: "Actively help a family member achieve something important to them", tags: ["family", "support", "relationships"] },
  ],
  spirituality: [
    { title: "Establish a meditation practice", description: "Meditate daily for at least 20 minutes over 90 days", tags: ["spirituality", "mindfulness", "discipline"] },
    { title: "Explore philosophical frameworks", description: "Study and reflect on philosophical or spiritual traditions", tags: ["spirituality", "growth", "wisdom"] },
  ],
  adventure: [
    { title: "Plan a transformative trip", description: "Travel to a new country or region that challenges your perspective", tags: ["adventure", "travel", "growth"] },
    { title: "Try 12 new experiences this year", description: "Push comfort zone by trying one new activity each month", tags: ["adventure", "growth", "variety"] },
  ],
};

function computeGoalCoverage(
  existingGoals: { title: string; status: string }[],
  valueTags: string[]
): Map<string, number> {
  const coverage = new Map<string, number>();
  const activeGoals = existingGoals.filter((g) => g.status === "ACTIVE");

  for (const tag of valueTags) {
    let tagCoverage = 0;
    for (const goal of activeGoals) {
      const titleLower = goal.title.toLowerCase();
      if (titleLower.includes(tag) || tag.split(/\s+/).some((w) => titleLower.includes(w))) {
        tagCoverage = 1;
      }
    }
    coverage.set(tag, tagCoverage);
  }

  return coverage;
}

function generateTemplateSuggestions(
  typedValues: ValueRow[],
  goals: { title: string; status: string }[]
): GoalSuggestion[] {
  const existingGoalTitles = new Set(goals.map((g) => g.title.toLowerCase()));
  const allValueTags = typedValues.flatMap((v) => v.tags);
  const coverage = computeGoalCoverage(goals, allValueTags);

  const suggestions: GoalSuggestion[] = [];
  const totalValues = typedValues.length;

  for (const value of typedValues) {
    const candidates: { title: string; description: string; tags: string[]; matchScore: number }[] = [];

    for (const tag of value.tags) {
      const templates = GOAL_TEMPLATES[tag] || [];
      for (const template of templates) {
        if (existingGoalTitles.has(template.title.toLowerCase())) continue;
        if (candidates.some((c) => c.title === template.title)) continue;

        const tagCoverage = coverage.get(tag) ?? 0;
        const underservedBonus = 1 - tagCoverage;
        const importance = 1 - ((value.rank - 1) / Math.max(totalValues - 1, 1));
        const matchScore = underservedBonus * importance;
        candidates.push({ ...template, matchScore });
      }
    }

    candidates.sort((a, b) => b.matchScore - a.matchScore);
    const topCandidates = candidates.slice(0, 2);

    for (const candidate of topCandidates) {
      const priority: "HIGH" | "MEDIUM" | "LOW" =
        value.rank <= 2 ? "HIGH" : value.rank <= 4 ? "MEDIUM" : "LOW";

      const coverageInfo = value.tags
        .map((t) => {
          const cov = coverage.get(t) ?? 0;
          return cov > 0 ? `${t} (${Math.round(cov * 100)}% covered)` : `${t} (no active goals)`;
        })
        .join(", ");

      suggestions.push({
        title: candidate.title,
        description: candidate.description,
        reasoning: `Aligns with your value "${value.label}" (rank #${value.rank}). Current coverage: ${coverageInfo}.`,
        alignedValues: [value.label],
        priority,
      });
    }
  }

  const seen = new Set<string>();
  const unique = suggestions.filter((s) => {
    if (seen.has(s.title)) return false;
    seen.add(s.title);
    return true;
  });

  const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  unique.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

  return unique.slice(0, 8);
}

export async function GET() {
  const [values, goals] = await Promise.all([
    prisma.value.findMany({ orderBy: { rank: "asc" } }),
    prisma.goal.findMany({
      select: { title: true, description: true, status: true, completedAt: true },
    }),
  ]);

  if (values.length === 0) {
    return NextResponse.json({
      suggestions: [],
      message: "Define your values first to get personalized goal suggestions.",
    });
  }

  const typedValues = values as ValueRow[];
  const valuesSummary = typedValues.map((v) => `${v.label} (rank: ${v.rank})`).join(", ");

  // Try Gemini first, fall back to templates
  let suggestions = await generateWithGemini(typedValues, goals);
  let source: "gemini" | "templates" = "gemini";

  if (!suggestions || suggestions.length === 0) {
    suggestions = generateTemplateSuggestions(typedValues, goals);
    source = "templates";
  }

  return NextResponse.json({
    suggestions,
    valuesSummary,
    source,
  });
}
