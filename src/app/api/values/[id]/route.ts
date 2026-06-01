import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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
  const { id } = await params
  await prisma.value.delete({ where: { id } })
  return NextResponse.json({ deleted: true })
}
