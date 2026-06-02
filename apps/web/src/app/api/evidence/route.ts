import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'
import { recordEvent } from '@/lib/events/store'

export async function GET() {
  const evidence = await prisma.evidence.findMany({
    include: { prerequisite: true, stakeholder: true },
    orderBy: { occurredAt: 'desc' },
  })
  return NextResponse.json(evidence)
}

export async function POST(request: Request) {
  const body = await request.json()
  const evidence = await prisma.evidence.create({
    data: {
      title: body.title,
      description: body.description,
      source: body.source,
      occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
      prerequisiteId: body.prerequisiteId || null,
      stakeholderId: body.stakeholderId || null,
    },
  })

  await recordEvent('EVIDENCE', evidence.id, 'CREATED', {
    title: evidence.title,
    source: evidence.source,
  })

  return NextResponse.json(evidence, { status: 201 })
}
