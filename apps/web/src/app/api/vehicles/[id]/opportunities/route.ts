import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: vehicleId } = await params
  const body = await request.json()

  const opportunity = await prisma.opportunity.create({
    data: {
      title: body.title,
      description: body.description,
      vehicleId,
      goalId: body.goalId || null,
      realized: body.realized || false,
      realizedAt: body.realizedAt ? new Date(body.realizedAt) : null,
    },
  })

  return NextResponse.json(opportunity, { status: 201 })
}
