import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'
import { requireAuthUserId } from '@/lib/server/auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; dimId: string }> }
) {
  const userId = await requireAuthUserId()
  const { id: vehicleId, dimId } = await params
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId, userId } })
  if (!vehicle) {
    return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
  }
  const body = await request.json()
  const dimension = await prisma.controlDimension.update({
    where: { id: dimId },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined
        ? { description: body.description }
        : {}),
      ...(body.value !== undefined ? { value: Number(body.value) } : {}),
      ...(body.icon !== undefined ? { icon: body.icon } : {}),
      ...(body.color !== undefined ? { color: body.color } : {}),
    },
  })
  return NextResponse.json(dimension)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; dimId: string }> }
) {
  const userId = await requireAuthUserId()
  const { id: vehicleId, dimId } = await params
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId, userId } })
  if (!vehicle) {
    return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
  }
  await prisma.controlDimension.delete({ where: { id: dimId } })
  return NextResponse.json({ ok: true })
}
