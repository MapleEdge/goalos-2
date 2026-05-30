import { NextResponse } from "next/server";
import { generateRecommendations } from "@/lib/reasoning/engine";
import { enhanceWithAI, isAIAvailable } from "@/lib/reasoning/ai";

export async function GET() {
  const recommendations = await generateRecommendations();
  return NextResponse.json({
    ...recommendations,
    aiAvailable: isAIAvailable(),
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const recommendations = await generateRecommendations();

  let aiInsight: string | null = null;
  if (isAIAvailable()) {
    aiInsight = await enhanceWithAI(recommendations, body.prompt);
  }

  return NextResponse.json({
    ...recommendations,
    aiInsight,
    aiAvailable: isAIAvailable(),
  });
}
