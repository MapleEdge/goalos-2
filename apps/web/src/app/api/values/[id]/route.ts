import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'
import { requireAuthUserId } from '@/lib/server/auth'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireAuthUserId()
  const { id } = await params
  const existing = await prisma.value.findFirst({ where: { id, userId } })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const body = await request.json()
  const value = await prisma.value.update({
    where: { id },
    data: {
      label: body.label,
      rank: body.rank,
      description: body.description,
      tags: body.tags,
    },
  })
  return NextResponse.json(value)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireAuthUserId()
  const { id } = await params
  const existing = await prisma.value.findFirst({ where: { id, userId } })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  await prisma.value.delete({ where: { id } })
  return NextResponse.json({ deleted: true })
}
