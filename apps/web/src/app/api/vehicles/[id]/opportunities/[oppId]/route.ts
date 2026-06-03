import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'
import { requireAuthUserId } from '@/lib/server/auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; oppId: string }> }
) {
  const userId = await requireAuthUserId()
  const { id: vehicleId, oppId } = await params
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId, userId } })
  if (!vehicle) {
    return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
  }
  const body = await request.json()

  const opportunity = await prisma.opportunity.update({
    where: { id: oppId },
    data: {
      title: body.title,
      description: body.description,
      realized: body.realized,
      realizedAt: body.realized ? new Date() : null,
    },
  })

  return NextResponse.json(opportunity)
}
