import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'
import { requireAuthUserId } from '@/lib/server/auth'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireAuthUserId()
  const { id } = await params
  const vehicle = await prisma.vehicle.findUnique({ where: { id, userId } })
  if (!vehicle) {
    return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
  }
  const dimensions = await prisma.controlDimension.findMany({
    where: { vehicleId: id },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(dimensions)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireAuthUserId()
  const { id } = await params
  const vehicle = await prisma.vehicle.findUnique({ where: { id, userId } })
  if (!vehicle) {
    return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
  }
  const body = await request.json()
  const dimension = await prisma.controlDimension.create({
    data: {
      vehicleId: id,
      name: body.name,
      description: body.description || null,
      value: body.value !== undefined ? Number(body.value) : 0,
      icon: body.icon || null,
      color: body.color || null,
    },
  })
  return NextResponse.json(dimension, { status: 201 })
}
