import { NextResponse } from "next/server";
import { getRecentEvents, getEventTimeline } from "@/lib/events/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const since = searchParams.get("since");
  const limit = searchParams.get("limit");

  if (since) {
    const events = await getEventTimeline(new Date(since));
    return NextResponse.json(events);
  }

  const events = await getRecentEvents(limit ? parseInt(limit) : 50);
  return NextResponse.json(events);
}
