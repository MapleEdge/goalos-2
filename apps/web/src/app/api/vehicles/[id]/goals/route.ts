import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'
import { requireAuthUserId } from '@/lib/server/auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireAuthUserId()
  const { id: vehicleId } = await params
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId, userId } })
  if (!vehicle) {
    return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
  }
  const body = await request.json()

  const link = await prisma.vehicleGoal.create({
    data: {
      vehicleId,
      goalId: body.goalId,
      leverage: body.leverage,
    },
    include: {
      goal: { select: { id: true, title: true, status: true } },
    },
  })

  return NextResponse.json(link, { status: 201 })
}
