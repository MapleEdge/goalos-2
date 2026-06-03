import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'
import { requireAuthUserId } from '@/lib/server/auth'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; goalId: string }> }
) {
  const userId = await requireAuthUserId()
  const { id: vehicleId, goalId } = await params
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId, userId } })
  if (!vehicle) {
    return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
  }
  await prisma.vehicleGoal.delete({
    where: { vehicleId_goalId: { vehicleId, goalId } },
  })
  return NextResponse.json({ success: true })
}
