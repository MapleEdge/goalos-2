import { NextResponse } from 'next/server'
import { recordEvent } from '@/lib/events/store'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const evidence = await prisma.evidence.findUnique({
    where: { id },
    include: { prerequisite: true, stakeholder: true },
  })
  if (!evidence) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(evidence)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const evidence = await prisma.evidence.update({
    where: { id },
    data: {
      title: body.title,
      description: body.description,
      source: body.source,
      occurredAt: body.occurredAt ? new Date(body.occurredAt) : undefined,
      prerequisiteId: body.prerequisiteId,
      stakeholderId: body.stakeholderId,
    },
  })

  await recordEvent('EVIDENCE', id, 'UPDATED', {
    updatedFields: Object.keys(body),
  })

  return NextResponse.json(evidence)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await recordEvent('EVIDENCE', id, 'DELETED', {})
  await prisma.evidence.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
