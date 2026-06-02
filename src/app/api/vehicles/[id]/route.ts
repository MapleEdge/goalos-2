import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      value: { select: { id: true, label: true, rank: true } },
      values: { select: { id: true, label: true } },
      vehicleGoals: {
        include: { goal: { select: { id: true, title: true, status: true } } },
      },
      opportunities: { orderBy: { createdAt: 'desc' } },
      controlDimensions: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!vehicle) {
    return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
  }
  return NextResponse.json(vehicle)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const existing = await prisma.vehicle.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
  }

  const vehicle = await prisma.vehicle.update({
    where: { id },
    data: {
      title: body.title,
      description: body.description,
      type: body.type,
      status: body.status,
      institution: body.institution,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      investmentNotes: body.investmentNotes,
      valueId: body.valueId,
      ...(body.valueIds !== undefined
        ? { values: { set: body.valueIds.map((vid: string) => ({ id: vid })) } }
        : {}),
    },
    include: {
      value: { select: { id: true, label: true, rank: true } },
      values: { select: { id: true, label: true } },
      vehicleGoals: {
        include: { goal: { select: { id: true, title: true, status: true } } },
      },
      opportunities: true,
    },
  })

  return NextResponse.json(vehicle)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.vehicle.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
