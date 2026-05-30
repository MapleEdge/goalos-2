import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordEvent } from "@/lib/events/store";

export async function GET() {
  const stakeholders = await prisma.stakeholder.findMany({
    include: { evidence: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(stakeholders);
}

export async function POST(request: Request) {
  const body = await request.json();
  const stakeholder = await prisma.stakeholder.create({
    data: {
      name: body.name,
      organization: body.organization,
      role: body.role,
      relationshipStrength: body.relationshipStrength ?? 0,
      lastInteraction: body.lastInteraction
        ? new Date(body.lastInteraction)
        : null,
      notes: body.notes,
      capabilities: body.capabilities ?? undefined,
    },
  });

  await recordEvent("STAKEHOLDER", stakeholder.id, "CREATED", {
    name: stakeholder.name,
  });

  return NextResponse.json(stakeholder, { status: 201 });
}
