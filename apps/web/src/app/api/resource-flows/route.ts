import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const entityType = searchParams.get('entityType')
  const entityId = searchParams.get('entityId')
  const resourceTypeId = searchParams.get('resourceTypeId')
  const direction = searchParams.get('direction')
  const activeOnly = searchParams.get('activeOnly') !== 'false'

  const where: Record<string, unknown> = {}
  if (entityType) where.entityType = entityType
  if (entityId) where.entityId = entityId
  if (resourceTypeId) where.resourceTypeId = resourceTypeId
  if (direction) where.direction = direction
  if (activeOnly) where.isActive = true

  const flows = await prisma.resourceFlow.findMany({
    where,
    include: { resourceType: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(flows)
}

export async function POST(request: Request) {
  const body = await request.json()
  const {
    resourceTypeId,
    entityType,
    entityId,
    direction,
    amount,
    frequency,
    label,
    notes,
    startDate,
    endDate,
  } = body

  if (
    !resourceTypeId ||
    !entityType ||
    !entityId ||
    !direction ||
    amount == null ||
    !label?.trim()
  ) {
    return NextResponse.json(
      {
        error:
          'resourceTypeId, entityType, entityId, direction, amount, and label are required',
      },
      { status: 400 }
    )
  }

  const flow = await prisma.resourceFlow.create({
    data: {
      resourceTypeId,
      entityType,
      entityId,
      direction,
      amount: Number(amount),
      frequency: frequency || 'ONE_TIME',
      label: label.trim(),
      notes: notes || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
    include: { resourceType: true },
  })
  return NextResponse.json(flow, { status: 201 })
}
