import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'
import { recordEvent } from '@/lib/events/store'
import { requireAuthUserId } from '@/lib/server/auth'

export async function GET() {
  const userId = await requireAuthUserId()
  const values = await prisma.value.findMany({
    where: { userId },
    orderBy: { rank: 'asc' },
  })
  return NextResponse.json(values)
}

export async function POST(request: Request) {
  const body = await request.json()
  const userId = await requireAuthUserId()
  const value = await prisma.value.create({
    data: {
      label: body.label,
      rank: body.rank ?? 0,
      description: body.description ?? null,
      tags: body.tags ?? [],
      userId,
    },
  })

  await recordEvent('GOAL', value.id, 'CREATED', {
    type: 'VALUE',
    label: value.label,
    rank: value.rank,
  })

  return NextResponse.json(value, { status: 201 })
}
