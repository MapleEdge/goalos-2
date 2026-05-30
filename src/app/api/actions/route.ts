import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordEvent } from "@/lib/events/store";

export async function GET() {
  const actions = await prisma.action.findMany({
    include: { goal: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(actions);
}

export async function POST(request: Request) {
  const body = await request.json();
  const action = await prisma.action.create({
    data: {
      title: body.title,
      status: body.status || "TODO",
      priority: body.priority || "MEDIUM",
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      goalId: body.goalId,
    },
  });

  await recordEvent("ACTION", action.id, "CREATED", {
    title: action.title,
    goalId: action.goalId,
  });

  return NextResponse.json(action, { status: 201 });
}
