import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'
import { requireAuthUserId } from '@/lib/server/auth'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const userId = await requireAuthUserId()

  const vehicles = await prisma.vehicle.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      userId,
    },
    include: {
      value: { select: { id: true, label: true, rank: true } },
      values: { select: { id: true, label: true } },
      vehicleGoals: {
        include: { goal: { select: { id: true, title: true, status: true } } },
      },
      opportunities: true,
      controlDimensions: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: [{ leverageScore: 'desc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json(vehicles)
}

export async function POST(request: Request) {
  const body = await request.json()
  const userId = await requireAuthUserId()
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
      userId,
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
