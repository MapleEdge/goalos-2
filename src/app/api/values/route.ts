import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordEvent } from "@/lib/events/store";

export async function GET() {
  const values = await prisma.value.findMany({
    orderBy: { rank: "asc" },
  });
  return NextResponse.json(values);
}

export async function POST(request: Request) {
  const body = await request.json();
  const value = await prisma.value.create({
    data: {
      label: body.label,
      rank: body.rank ?? 0,
      description: body.description ?? null,
      tags: body.tags ?? [],
    },
  });

  await recordEvent("GOAL", value.id, "CREATED", {
    type: "VALUE",
    label: value.label,
    rank: value.rank,
  });

  return NextResponse.json(value, { status: 201 });
}
