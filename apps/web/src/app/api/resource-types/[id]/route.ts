import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'
import { requireAuthUserId } from '@/lib/server/auth'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAuthUserId()
  const { id } = await params
  const type = await prisma.resourceType.findUnique({
    where: { id },
    include: { _count: { select: { flows: true } } },
  })
  if (!type) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(type)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAuthUserId()
  const { id } = await params
  const body = await request.json()
  const type = await prisma.resourceType.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.unit !== undefined ? { unit: body.unit } : {}),
      ...(body.icon !== undefined ? { icon: body.icon } : {}),
      ...(body.color !== undefined ? { color: body.color } : {}),
      ...(body.description !== undefined
        ? { description: body.description }
        : {}),
    },
  })
  return NextResponse.json(type)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAuthUserId()
  const { id } = await params
  await prisma.resourceType.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
