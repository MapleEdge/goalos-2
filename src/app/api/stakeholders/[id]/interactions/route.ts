import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordEvent, getEntityEvents } from "@/lib/events/store";

type InteractionType = "MEETING" | "EMAIL" | "CALL" | "MESSAGE" | "NOTE";

// Default strength bump per channel — richer touchpoints move the needle more.
const DEFAULT_DELTA: Record<InteractionType, number> = {
  MEETING: 8,
  CALL: 6,
  EMAIL: 4,
  MESSAGE: 3,
  NOTE: 0,
};

const TYPE_VERB: Record<InteractionType, string> = {
  MEETING: "Met with",
  CALL: "Called",
  EMAIL: "Emailed",
  MESSAGE: "Messaged",
  NOTE: "Note on",
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const stakeholder = await prisma.stakeholder.findUnique({ where: { id } });
  if (!stakeholder) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const events = await getEntityEvents("STAKEHOLDER", id);
  const interactions = events
    .filter(
      (e) =>
        e.eventType === "INTERACTION_LOGGED" ||
        e.eventType === "INTERACTION_UPDATED"
    )
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

  return NextResponse.json(interactions);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const stakeholder = await prisma.stakeholder.findUnique({ where: { id } });
  if (!stakeholder) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const type: InteractionType = (
    ["MEETING", "EMAIL", "CALL", "MESSAGE", "NOTE"].includes(body.type)
      ? body.type
      : "NOTE"
  ) as InteractionType;
  const note: string | null = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
  const delta =
    typeof body.strengthDelta === "number"
      ? Math.round(body.strengthDelta)
      : DEFAULT_DELTA[type];
  const occurredAt = body.occurredAt ? new Date(body.occurredAt) : new Date();

  const newStrength = clamp(stakeholder.relationshipStrength + delta);

  // Record the interaction as evidence so it surfaces on the Timeline and keeps
  // the graph event-sourced.
  const evidence = await prisma.evidence.create({
    data: {
      title: `${TYPE_VERB[type]} ${stakeholder.name}`,
      description: note,
      source: type.toLowerCase(),
      occurredAt,
      stakeholderId: id,
    },
  });

  const updated = await prisma.stakeholder.update({
    where: { id },
    data: {
      relationshipStrength: newStrength,
      lastInteraction: occurredAt,
      ...(note ? { notes: note } : {}),
    },
  });

  await recordEvent("STAKEHOLDER", id, "INTERACTION_LOGGED", {
    type,
    note,
    strengthDelta: delta,
    previousStrength: stakeholder.relationshipStrength,
    newStrength,
    evidenceId: evidence.id,
  });

  return NextResponse.json(
    { stakeholder: updated, evidence },
    { status: 201 }
  );
}
