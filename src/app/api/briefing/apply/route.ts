import { NextResponse } from 'next/server'
import { recordEvent } from '@/lib/events/store'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/session'

interface OpData {
  [key: string]: unknown
}

interface Operation {
  type: 'create' | 'update'
  entity: string
  data: OpData
  existingId?: string
  reason?: string
}

interface LinkOp {
  type: 'vehicleGoal'
  vehicleTitle: string
  goalTitle: string
  leverage?: string
}

export async function POST(request: Request) {
  const session = await requireSession()
  const { operations, links } = (await request.json()) as {
    operations: Operation[]
    links?: LinkOp[]
  }

  if (!operations || !Array.isArray(operations)) {
    return NextResponse.json(
      { error: 'Missing operations array' },
      { status: 400 }
    )
  }

  const results: {
    entity: string
    action: string
    id: string
    title: string
  }[] = []
  // Track newly created entities for linking
  const createdGoals: Record<string, string> = {}
  const createdVehicles: Record<string, string> = {}

  for (const op of operations) {
    try {
      if (op.entity === 'goal') {
        if (op.type === 'create') {
          const goal = await prisma.goal.create({
            data: {
              title: String(op.data.title || ''),
              description: op.data.description
                ? String(op.data.description)
                : null,
              status: (op.data.status as never) || 'ACTIVE',
              successCriteria: op.data.successCriteria
                ? String(op.data.successCriteria)
                : null,
              targetDate: op.data.targetDate
                ? new Date(String(op.data.targetDate))
                : null,
              userId: session.user.id,
            },
          })
          await recordEvent('GOAL', goal.id, 'CREATED', {
            title: goal.title,
            source: 'briefing',
          })
          createdGoals[goal.title] = goal.id
          results.push({
            entity: 'goal',
            action: 'created',
            id: goal.id,
            title: goal.title,
          })
        } else if (op.type === 'update' && op.existingId) {
          const goal = await prisma.goal.update({
            where: { id: op.existingId },
            data: {
              ...(op.data.title ? { title: String(op.data.title) } : {}),
              ...(op.data.description
                ? { description: String(op.data.description) }
                : {}),
              ...(op.data.status ? { status: op.data.status as never } : {}),
              ...(op.data.successCriteria
                ? { successCriteria: String(op.data.successCriteria) }
                : {}),
            },
          })
          await recordEvent('GOAL', goal.id, 'UPDATED', {
            source: 'briefing',
          })
          results.push({
            entity: 'goal',
            action: 'updated',
            id: goal.id,
            title: goal.title,
          })
        }
      } else if (op.entity === 'vehicle') {
        if (op.type === 'create') {
          const vehicle = await prisma.vehicle.create({
            data: {
              title: String(op.data.title || ''),
              description: op.data.description
                ? String(op.data.description)
                : null,
              type: (op.data.type as never) || 'OTHER',
              status: (op.data.status as never) || 'IDENTIFIED',
              institution: op.data.institution
                ? String(op.data.institution)
                : null,
              userId: session.user.id,
            },
          })
          await recordEvent('VEHICLE', vehicle.id, 'CREATED', {
            title: vehicle.title,
            source: 'briefing',
          })
          createdVehicles[vehicle.title] = vehicle.id
          results.push({
            entity: 'vehicle',
            action: 'created',
            id: vehicle.id,
            title: vehicle.title,
          })
        } else if (op.type === 'update' && op.existingId) {
          const vehicle = await prisma.vehicle.update({
            where: { id: op.existingId },
            data: {
              ...(op.data.title ? { title: String(op.data.title) } : {}),
              ...(op.data.description
                ? { description: String(op.data.description) }
                : {}),
              ...(op.data.status ? { status: op.data.status as never } : {}),
              ...(op.data.type ? { type: op.data.type as never } : {}),
              ...(op.data.institution
                ? { institution: String(op.data.institution) }
                : {}),
            },
          })
          await recordEvent('VEHICLE', vehicle.id, 'UPDATED', {
            source: 'briefing',
          })
          results.push({
            entity: 'vehicle',
            action: 'updated',
            id: vehicle.id,
            title: vehicle.title,
          })
        }
      } else if (op.entity === 'stakeholder') {
        if (op.type === 'create') {
          const stakeholder = await prisma.stakeholder.create({
            data: {
              name: String(op.data.name || ''),
              organization: op.data.organization
                ? String(op.data.organization)
                : null,
              role: op.data.role ? String(op.data.role) : null,
              notes: op.data.notes ? String(op.data.notes) : null,
              relationshipStrength: Number(op.data.relationshipStrength) || 0,
              userId: session.user.id,
            },
          })
          await recordEvent('STAKEHOLDER', stakeholder.id, 'CREATED', {
            name: stakeholder.name,
            source: 'briefing',
          })
          results.push({
            entity: 'stakeholder',
            action: 'created',
            id: stakeholder.id,
            title: stakeholder.name,
          })
        } else if (op.type === 'update' && op.existingId) {
          const stakeholder = await prisma.stakeholder.update({
            where: { id: op.existingId },
            data: {
              ...(op.data.name ? { name: String(op.data.name) } : {}),
              ...(op.data.organization
                ? { organization: String(op.data.organization) }
                : {}),
              ...(op.data.role ? { role: String(op.data.role) } : {}),
              ...(op.data.notes ? { notes: String(op.data.notes) } : {}),
              ...(op.data.relationshipStrength !== undefined
                ? {
                    relationshipStrength: Number(op.data.relationshipStrength),
                  }
                : {}),
            },
          })
          results.push({
            entity: 'stakeholder',
            action: 'updated',
            id: stakeholder.id,
            title: stakeholder.name,
          })
        }
      } else if (op.entity === 'controlDimension') {
        if (op.type === 'create') {
          const vehicleId =
            String(op.data.vehicleId || '') ||
            createdVehicles[String(op.data.vehicleTitle || '')]
          if (!vehicleId) continue
          const dim = await prisma.controlDimension.create({
            data: {
              vehicleId,
              name: String(op.data.name || ''),
              description: op.data.description
                ? String(op.data.description)
                : null,
              value: Number(op.data.value) || 0,
              icon: op.data.icon ? String(op.data.icon) : null,
              color: op.data.color ? String(op.data.color) : null,
            },
          })
          results.push({
            entity: 'controlDimension',
            action: 'created',
            id: dim.id,
            title: dim.name,
          })
        }
      } else if (op.entity === 'value') {
        if (op.type === 'create') {
          const existing = await prisma.value.findUnique({
            where: { userId_label: { userId: session.user.id, label: String(op.data.label || '') } },
          })
          if (existing) {
            results.push({
              entity: 'value',
              action: 'skipped (exists)',
              id: existing.id,
              title: existing.label,
            })
            continue
          }
          const value = await prisma.value.create({
            data: {
              label: String(op.data.label || ''),
              description: op.data.description
                ? String(op.data.description)
                : null,
              rank: Number(op.data.rank) || 0,
              userId: session.user.id,
            },
          })
          results.push({
            entity: 'value',
            action: 'created',
            id: value.id,
            title: value.label,
          })
        }
      }
    } catch (err) {
      results.push({
        entity: op.entity,
        action: `error: ${err instanceof Error ? err.message : String(err)}`,
        id: op.existingId || '',
        title: String(op.data?.title || op.data?.name || op.data?.label || ''),
      })
    }
  }

  // Process links
  if (links && Array.isArray(links)) {
    for (const link of links) {
      try {
        if (link.type === 'vehicleGoal') {
          // Find vehicle
          let vehicleId = createdVehicles[link.vehicleTitle]
          if (!vehicleId) {
            const v = await prisma.vehicle.findFirst({
              where: { title: link.vehicleTitle },
            })
            if (v) vehicleId = v.id
          }
          // Find goal
          let goalId = createdGoals[link.goalTitle]
          if (!goalId) {
            const g = await prisma.goal.findFirst({
              where: { title: link.goalTitle },
            })
            if (g) goalId = g.id
          }
          if (vehicleId && goalId) {
            await prisma.vehicleGoal.upsert({
              where: {
                vehicleId_goalId: { vehicleId, goalId },
              },
              create: {
                vehicleId,
                goalId,
                leverage: link.leverage || null,
              },
              update: {
                leverage: link.leverage || null,
              },
            })
            results.push({
              entity: 'vehicleGoal',
              action: 'linked',
              id: `${vehicleId}-${goalId}`,
              title: `${link.vehicleTitle} → ${link.goalTitle}`,
            })
          }
        }
      } catch {
        // skip failed links
      }
    }
  }

  return NextResponse.json({ results, count: results.length })
}
