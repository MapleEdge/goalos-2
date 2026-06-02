import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  const vehicles = await prisma.vehicle.findMany({
    where: status ? { status: status as never } : undefined,
    include: {
      value: { select: { id: true, label: true, rank: true } },
      values: { select: { id: true, label: true } },
      vehicleGoals: {
        include: { goal: { select: { id: true, title: true, status: true } } },
      },
      opportunities: true,
    },
    orderBy: [{ leverageScore: 'desc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json(vehicles)
}

export async function POST(request: Request) {
  const body = await request.json()
  const vehicle = await prisma.vehicle.create({
    data: {
      title: body.title,
      description: body.description,
      type: body.type,
      status: body.status || 'IDENTIFIED',
      institution: body.institution,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      investmentNotes: body.investmentNotes,
      valueId: body.valueId || null,
      ...(body.valueIds?.length
        ? { values: { connect: body.valueIds.map((id: string) => ({ id })) } }
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

  return NextResponse.json(vehicle, { status: 201 })
}
