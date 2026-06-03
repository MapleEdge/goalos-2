import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'
import { recordEvent } from '@/lib/events/store'
import { requireAuthUserId } from '@/lib/server/auth'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireAuthUserId()
  const { id } = await params
  const stakeholder = await prisma.stakeholder.findUnique({
    where: { id, userId },
    include: { evidence: true },
  })
  if (!stakeholder) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(stakeholder)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireAuthUserId()
  const { id } = await params
  const existing = await prisma.stakeholder.findUnique({ where: { id, userId } })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const body = await request.json()
  const stakeholder = await prisma.stakeholder.update({
    where: { id },
    data: {
      name: body.name,
      organization: body.organization,
      role: body.role,
      relationshipStrength: body.relationshipStrength,
      lastInteraction: body.lastInteraction
        ? new Date(body.lastInteraction)
        : undefined,
      notes: body.notes,
      ...(body.capabilities !== undefined
        ? { capabilities: body.capabilities }
        : {}),
      ...(body.valueExchangeAssets !== undefined
        ? { valueExchangeAssets: body.valueExchangeAssets }
        : {}),
      ...(body.userAssets !== undefined ? { userAssets: body.userAssets } : {}),
    },
  })

  await recordEvent('STAKEHOLDER', id, 'UPDATED', {
    updatedFields: Object.keys(body),
  })

  return NextResponse.json(stakeholder)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireAuthUserId()
  const { id } = await params
  const existing = await prisma.stakeholder.findUnique({ where: { id, userId } })
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  await recordEvent('STAKEHOLDER', id, 'DELETED', {})
  await prisma.stakeholder.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
