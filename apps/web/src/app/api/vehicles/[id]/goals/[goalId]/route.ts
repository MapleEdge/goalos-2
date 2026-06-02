import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; goalId: string }> }
) {
  const { id: vehicleId, goalId } = await params
  await prisma.vehicleGoal.delete({
    where: { vehicleId_goalId: { vehicleId, goalId } },
  })
  return NextResponse.json({ success: true })
}
