import type { NodeType } from '@prisma/client'
import { NextResponse } from 'next/server'
import { recordEvent } from '@/lib/events/store'
import { prisma } from '@/lib/prisma'

function getForeignKeyFields(
  type: NodeType,
  direction: 'from' | 'to',
  id: string
): Record<string, string> {
  const suffix = direction === 'from' ? 'FromId' : 'ToId'
  switch (type) {
    case 'GOAL':
      return { [`goal${suffix}`]: id }
    case 'STAKEHOLDER':
      return { [`stakeholder${suffix}`]: id }
    case 'PREREQUISITE':
      return { [`prereq${suffix}`]: id }
    case 'EVIDENCE':
      return { [`evidence${suffix}`]: id }
    case 'ACTION':
      return { [`action${suffix}`]: id }
    default:
      return {}
  }
}

export async function GET() {
  const relationships = await prisma.relationship.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(relationships)
}

export async function POST(request: Request) {
  const body = await request.json()

  const fromFK = getForeignKeyFields(
    body.fromType as NodeType,
    'from',
    body.fromId
  )
  const toFK = getForeignKeyFields(body.toType as NodeType, 'to', body.toId)

  const relationship = await prisma.relationship.create({
    data: {
      fromType: body.fromType,
      fromId: body.fromId,
      toType: body.toType,
      toId: body.toId,
      label: body.label,
      weight: body.weight ?? 1.0,
      ...fromFK,
      ...toFK,
    },
  })

  await recordEvent(
    body.fromType as NodeType,
    body.fromId,
    'RELATIONSHIP_ADDED',
    {
      toType: body.toType,
      toId: body.toId,
      label: body.label,
    }
  )

  return NextResponse.json(relationship, { status: 201 })
}
