import { prisma } from '@goalos/shared/lib/prisma'
import type { FlowDirection, FlowFrequency, NodeType } from '@prisma/client'
import { NextResponse } from 'next/server'

// Normalize any frequency to a monthly multiplier
const MONTHLY_MULTIPLIER: Record<FlowFrequency, number> = {
  ONE_TIME: 0, // one-time flows handled separately
  DAILY: 30,
  WEEKLY: 4.33,
  BIWEEKLY: 2.17,
  MONTHLY: 1,
  QUARTERLY: 1 / 3,
  YEARLY: 1 / 12,
}

interface FlowRow {
  direction: FlowDirection
  amount: number
  frequency: FlowFrequency
  resourceTypeId: string
  entityType: NodeType
  entityId: string
}

interface TypeSummary {
  resourceTypeId: string
  resourceTypeName: string
  unit: string
  color: string | null
  icon: string | null
  monthlyInflow: number
  monthlyOutflow: number
  monthlyNet: number
  oneTimeInflow: number
  oneTimeOutflow: number
  oneTimeNet: number
  totalNet: number // monthlyNet + oneTimeNet
}

interface EntitySummary {
  entityType: NodeType
  entityId: string
  entityName: string
  byType: TypeSummary[]
  totalMonthlyNet: number
}

// Resolve entity name from its table
async function resolveEntityName(
  entityType: NodeType,
  entityId: string
): Promise<string> {
  switch (entityType) {
    case 'GOAL': {
      const g = await prisma.goal.findUnique({
        where: { id: entityId },
        select: { title: true },
      })
      return g?.title || 'Unknown Goal'
    }
    case 'VEHICLE': {
      const v = await prisma.vehicle.findUnique({
        where: { id: entityId },
        select: { title: true },
      })
      return v?.title || 'Unknown Vehicle'
    }
    case 'STAKEHOLDER': {
      const s = await prisma.stakeholder.findUnique({
        where: { id: entityId },
        select: { name: true },
      })
      return s?.name || 'Unknown Stakeholder'
    }
    case 'ACTION': {
      const a = await prisma.action.findUnique({
        where: { id: entityId },
        select: { title: true },
      })
      return a?.title || 'Unknown Action'
    }
    case 'PREREQUISITE': {
      const p = await prisma.prerequisite.findUnique({
        where: { id: entityId },
        select: { title: true },
      })
      return p?.title || 'Unknown Prerequisite'
    }
    case 'EVIDENCE': {
      const e = await prisma.evidence.findUnique({
        where: { id: entityId },
        select: { title: true },
      })
      return e?.title || 'Unknown Evidence'
    }
    default:
      return 'Unknown'
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const entityType = searchParams.get('entityType') as NodeType | null
  const entityId = searchParams.get('entityId')
  const resourceTypeId = searchParams.get('resourceTypeId')

  const where: Record<string, unknown> = { isActive: true }
  if (entityType) where.entityType = entityType
  if (entityId) where.entityId = entityId
  if (resourceTypeId) where.resourceTypeId = resourceTypeId

  const flows = await prisma.resourceFlow.findMany({
    where,
    include: { resourceType: true },
  })

  const types = await prisma.resourceType.findMany()
  const typeMap = new Map(types.map((t) => [t.id, t]))

  // Group by entity
  const entityGroups = new Map<string, FlowRow[]>()
  for (const f of flows) {
    const key = `${f.entityType}::${f.entityId}`
    if (!entityGroups.has(key)) entityGroups.set(key, [])
    entityGroups.get(key)!.push(f)
  }

  // Build per-entity summaries
  const entities: EntitySummary[] = []
  for (const [key, entityFlows] of entityGroups) {
    const parts = key.split('::')
    const eType = parts[0] as NodeType
    const eId = parts[1] as string
    const entityName = await resolveEntityName(eType, eId)

    const byTypeMap = new Map<string, TypeSummary>()
    for (const f of entityFlows) {
      const rt = typeMap.get(f.resourceTypeId)
      if (!rt) continue

      if (!byTypeMap.has(f.resourceTypeId)) {
        byTypeMap.set(f.resourceTypeId, {
          resourceTypeId: f.resourceTypeId,
          resourceTypeName: rt.name,
          unit: rt.unit,
          color: rt.color,
          icon: rt.icon,
          monthlyInflow: 0,
          monthlyOutflow: 0,
          monthlyNet: 0,
          oneTimeInflow: 0,
          oneTimeOutflow: 0,
          oneTimeNet: 0,
          totalNet: 0,
        })
      }

      const ts = byTypeMap.get(f.resourceTypeId)!
      const mult = MONTHLY_MULTIPLIER[f.frequency]
      const isInflow = f.direction === 'INFLOW'

      if (f.frequency === 'ONE_TIME') {
        if (isInflow) ts.oneTimeInflow += f.amount
        else ts.oneTimeOutflow += f.amount
      } else {
        const monthly = f.amount * mult
        if (isInflow) ts.monthlyInflow += monthly
        else ts.monthlyOutflow += monthly
      }
    }

    const byType = Array.from(byTypeMap.values()).map((ts) => ({
      ...ts,
      monthlyNet: ts.monthlyInflow - ts.monthlyOutflow,
      oneTimeNet: ts.oneTimeInflow - ts.oneTimeOutflow,
      totalNet:
        ts.monthlyInflow -
        ts.monthlyOutflow +
        (ts.oneTimeInflow - ts.oneTimeOutflow),
    }))

    entities.push({
      entityType: eType as NodeType,
      entityId: eId,
      entityName,
      byType,
      totalMonthlyNet: byType.reduce((sum, t) => sum + t.monthlyNet, 0),
    })
  }

  // Build global summary (across all entities)
  const globalByTypeMap = new Map<string, TypeSummary>()
  for (const entity of entities) {
    for (const ts of entity.byType) {
      if (!globalByTypeMap.has(ts.resourceTypeId)) {
        globalByTypeMap.set(ts.resourceTypeId, { ...ts })
      } else {
        const g = globalByTypeMap.get(ts.resourceTypeId)!
        g.monthlyInflow += ts.monthlyInflow
        g.monthlyOutflow += ts.monthlyOutflow
        g.monthlyNet += ts.monthlyNet
        g.oneTimeInflow += ts.oneTimeInflow
        g.oneTimeOutflow += ts.oneTimeOutflow
        g.oneTimeNet += ts.oneTimeNet
        g.totalNet += ts.totalNet
      }
    }
  }

  return NextResponse.json({
    global: Array.from(globalByTypeMap.values()),
    entities: entities.sort((a, b) => b.totalMonthlyNet - a.totalMonthlyNet),
  })
}
