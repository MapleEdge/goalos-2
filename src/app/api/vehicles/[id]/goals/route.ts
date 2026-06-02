import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: vehicleId } = await params
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
