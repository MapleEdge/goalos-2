import { NextResponse } from "next/server";
import OpenAI from "openai";

const VALID_INTENTS = [
  "review_all",
  "progress",
  "work_on",
  "navigate",
  "schedule_query",
  "help",
  "create_goal",
] as const;

type IntentLabel = (typeof VALID_INTENTS)[number];

const SYSTEM_PROMPT = `You classify user input into one intent. Reply with ONLY the intent label.

Intents:
- review_all: user wants to SEE or REVIEW their existing goals as a group (e.g. "review all goals", "show my goals", "goals overview", "summarize goals")
- progress: user asks about a SPECIFIC goal by name or topic (e.g. "how is my research paper", "status of fundraising")
- work_on: user asks what to focus on or do next (e.g. "what should I work on", "next steps", "priorities")
- navigate: user wants to go to a specific app page (e.g. "go to schedule", "open graph", "show timeline", "dashboard")
- schedule_query: user asks about their calendar or upcoming events (e.g. "whats on my calendar", "upcoming events")
- help: user asks for help or available commands (e.g. "help", "what can you do")
- create_goal: user describes something NEW they want to achieve that is NOT already a goal (e.g. "learn spanish by december", "save money for a house", "run a marathon")`;

function getOllamaClient(): OpenAI | null {
  const baseURL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  return new OpenAI({
    apiKey: "ollama",
    baseURL: `${baseURL}/v1`,
  });
}

function parseIntent(raw: string): IntentLabel {
  const cleaned = raw.trim().toLowerCase().replace(/^intent[:\s]*/i, "");
  for (const intent of VALID_INTENTS) {
    if (cleaned === intent || cleaned.startsWith(intent)) return intent;
  }
  return "create_goal";
}

const NAV_KEYWORDS: Record<string, string> = {
  schedule: "/schedule",
  calendar: "/schedule",
  graph: "/graph",
  timeline: "/timeline",
  history: "/timeline",
  events: "/timeline",
  dashboard: "/",
  home: "/",
};

function extractNavPage(input: string): string | null {
  const lower = input.toLowerCase();
  for (const [keyword, page] of Object.entries(NAV_KEYWORDS)) {
    if (lower.includes(keyword)) return page;
  }
  return null;
}

export async function POST(request: Request) {
  const { input } = await request.json();
  if (!input || typeof input !== "string") {
    return NextResponse.json({ error: "input is required" }, { status: 400 });
  }

  const client = getOllamaClient();
  if (!client) {
    return NextResponse.json({ intent: null, llm: false });
  }

  try {
    const model = process.env.OLLAMA_MODEL || "qwen2.5:1.5b";

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: input },
      ],
      temperature: 0,
      max_tokens: 20,
    });

    const raw = completion.choices[0]?.message?.content || "";
    const intent = parseIntent(raw);

    const result: Record<string, unknown> = { intent, llm: true };

    if (intent === "navigate") {
      const page = extractNavPage(input);
      if (page === null) {
        // LLM misclassified — input has no navigation keyword
        result.intent = "create_goal";
      } else {
        result.page = page;
      }
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ intent: null, llm: false });
  }
}
