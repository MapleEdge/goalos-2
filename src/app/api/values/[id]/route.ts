import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/session'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession()
  const { id } = await params
  const body = await request.json()
  const value = await prisma.value.update({
    where: { id, userId: session.user.id },
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
  const session = await requireSession()
  const { id } = await params
  await prisma.value.delete({ where: { id, userId: session.user.id } })
  return NextResponse.json({ deleted: true })
}
