import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; dimId: string }> }
) {
  const { dimId } = await params
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
  const { dimId } = await params
  await prisma.controlDimension.delete({ where: { id: dimId } })
  return NextResponse.json({ ok: true })
}
