import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'
import { recordEvent } from '@/lib/events/store'
import { requireAuthUserId } from '@/lib/server/auth'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAuthUserId()
  const { id } = await params
  const prereq = await prisma.prerequisite.findUnique({
    where: { id },
    include: { evidence: true, goal: true },
  })
  if (!prereq) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(prereq)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAuthUserId()
  const { id } = await params
  const body = await request.json()
  const prereq = await prisma.prerequisite.update({
    where: { id },
    data: {
      title: body.title,
      description: body.description,
      status: body.status,
      confidenceScore: body.confidenceScore,
    },
  })

  await recordEvent('PREREQUISITE', id, 'UPDATED', {
    updatedFields: Object.keys(body),
  })

  return NextResponse.json(prereq)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAuthUserId()
  const { id } = await params
  await recordEvent('PREREQUISITE', id, 'DELETED', {})
  await prisma.prerequisite.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
