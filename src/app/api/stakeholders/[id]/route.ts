import { NextResponse } from 'next/server'
import { recordEvent } from '@/lib/events/store'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const stakeholder = await prisma.stakeholder.findUnique({
    where: { id },
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
  const { id } = await params
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
  const { id } = await params
  await recordEvent('STAKEHOLDER', id, 'DELETED', {})
  await prisma.stakeholder.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
