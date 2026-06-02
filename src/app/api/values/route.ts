import { NextResponse } from 'next/server'
import { recordEvent } from '@/lib/events/store'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/session'

export async function GET() {
  const session = await requireSession()
  const values = await prisma.value.findMany({
    where: { userId: session.user.id },
    orderBy: { rank: 'asc' },
  })
  return NextResponse.json(values)
}

export async function POST(request: Request) {
  const session = await requireSession()
  const body = await request.json()
  const value = await prisma.value.create({
    data: {
      label: body.label,
      rank: body.rank ?? 0,
      description: body.description ?? null,
      tags: body.tags ?? [],
      userId: session.user.id,
    },
  })

  await recordEvent('GOAL', value.id, 'CREATED', {
    type: 'VALUE',
    label: value.label,
    rank: value.rank,
  })

  return NextResponse.json(value, { status: 201 })
}
