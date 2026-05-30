import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.scheduleEvent.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const updated = await prisma.scheduleEvent.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && {
        description: body.description || null,
      }),
      ...(body.startTime !== undefined && {
        startTime: new Date(body.startTime),
      }),
      ...(body.endTime !== undefined && { endTime: new Date(body.endTime) }),
      ...(body.allDay !== undefined && { allDay: body.allDay }),
      ...(body.location !== undefined && {
        location: body.location || null,
      }),
      ...(body.color !== undefined && { color: body.color || null }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = await prisma.scheduleEvent.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  await prisma.scheduleEvent.delete({ where: { id } });

  return NextResponse.json({ deleted: true });
}
