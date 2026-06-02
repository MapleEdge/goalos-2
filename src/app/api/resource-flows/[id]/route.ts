import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const flow = await prisma.resourceFlow.update({
    where: { id },
    data: {
      ...(body.amount !== undefined ? { amount: Number(body.amount) } : {}),
      ...(body.frequency !== undefined ? { frequency: body.frequency } : {}),
      ...(body.label !== undefined ? { label: body.label } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      ...(body.direction !== undefined ? { direction: body.direction } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      ...(body.startDate !== undefined
        ? { startDate: body.startDate ? new Date(body.startDate) : null }
        : {}),
      ...(body.endDate !== undefined
        ? { endDate: body.endDate ? new Date(body.endDate) : null }
        : {}),
    },
    include: { resourceType: true },
  })
  return NextResponse.json(flow)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.resourceFlow.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
