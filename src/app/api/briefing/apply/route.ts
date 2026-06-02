import { NextResponse } from 'next/server'
import { recordEvent } from '@/lib/events/store'
import { prisma } from '@/lib/prisma'

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

interface SuggestionInput {
  operation: Operation
  decision: 'accepted' | 'rejected' | 'skipped'
  rejectionReason?: string
}

interface LinkOp {
  type: 'vehicleGoal'
  vehicleTitle: string
  goalTitle: string
  leverage?: string
}

export async function POST(request: Request) {
  const body = await request.json()

  // Support both legacy format (operations[]) and new format (suggestions[] + inputText)
  const isNewFormat = 'suggestions' in body
  const inputText: string = body.inputText || ''
  const aiSummary: string = body.aiSummary || ''

  let suggestions: SuggestionInput[]
  let links: LinkOp[] = body.links || []

  if (isNewFormat) {
    suggestions = body.suggestions as SuggestionInput[]
  } else {
    // Legacy: all operations are accepted
    const ops = body.operations as Operation[]
    if (!ops || !Array.isArray(ops)) {
      return NextResponse.json(
        { error: 'Missing operations or suggestions array' },
        { status: 400 }
      )
    }
    suggestions = ops.map((op) => ({
      operation: op,
      decision: 'accepted' as const,
    }))
    links = body.links || []
  }

  // Create briefing session
  const session = await prisma.briefingSession.create({
    data: {
      inputText: inputText || '(not provided)',
      aiSummary: aiSummary || null,
    },
  })

  const results: {
    entity: string
    action: string
    id: string
    title: string
  }[] = []

  // Track newly created entities for linking
  const createdGoals: Record<string, string> = {}
  const createdVehicles: Record<string, string> = {}

  for (const suggestion of suggestions) {
    const { operation: op, decision, rejectionReason } = suggestion
    const entityTitle = String(
      op.data.title || op.data.name || op.data.label || ''
    )

    // If rejected or skipped, just record the suggestion — don't apply
    if (decision !== 'accepted') {
      await prisma.briefingSuggestion.create({
        data: {
          sessionId: session.id,
          operationType: op.type,
          entityType: op.entity,
          entityTitle,
          reason: op.reason || null,
          proposedData: op.data as never,
          decision: decision === 'rejected' ? 'REJECTED' : 'SKIPPED',
          rejectionReason: rejectionReason || null,
          resultAction: null,
          resultEntityId: null,
        },
      })
      continue
    }

    // Apply the accepted operation
    let resultAction = ''
    let resultEntityId = ''

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
            },
          })
          await recordEvent('GOAL', goal.id, 'CREATED', {
            title: goal.title,
            source: 'briefing',
          })
          createdGoals[goal.title] = goal.id
          resultAction = 'created'
          resultEntityId = goal.id
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
          resultAction = 'updated'
          resultEntityId = goal.id
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
            },
          })
          await recordEvent('VEHICLE', vehicle.id, 'CREATED', {
            title: vehicle.title,
            source: 'briefing',
          })
          createdVehicles[vehicle.title] = vehicle.id
          resultAction = 'created'
          resultEntityId = vehicle.id
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
          resultAction = 'updated'
          resultEntityId = vehicle.id
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
            },
          })
          await recordEvent('STAKEHOLDER', stakeholder.id, 'CREATED', {
            name: stakeholder.name,
            source: 'briefing',
          })
          resultAction = 'created'
          resultEntityId = stakeholder.id
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
          resultAction = 'updated'
          resultEntityId = stakeholder.id
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
          resultAction = 'created'
          resultEntityId = dim.id
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
            where: { label: String(op.data.label || '') },
          })
          if (existing) {
            resultAction = 'skipped (exists)'
            resultEntityId = existing.id
            results.push({
              entity: 'value',
              action: 'skipped (exists)',
              id: existing.id,
              title: existing.label,
            })
          } else {
            const value = await prisma.value.create({
              data: {
                label: String(op.data.label || ''),
                description: op.data.description
                  ? String(op.data.description)
                  : null,
                rank: Number(op.data.rank) || 0,
              },
            })
            resultAction = 'created'
            resultEntityId = value.id
            results.push({
              entity: 'value',
              action: 'created',
              id: value.id,
              title: value.label,
            })
          }
        } else if (op.type === 'update' && op.existingId) {
          const value = await prisma.value.update({
            where: { id: op.existingId },
            data: {
              ...(op.data.label ? { label: String(op.data.label) } : {}),
              ...(op.data.description
                ? { description: String(op.data.description) }
                : {}),
              ...(op.data.rank !== undefined
                ? { rank: Number(op.data.rank) }
                : {}),
            },
          })
          resultAction = 'updated'
          resultEntityId = value.id
          results.push({
            entity: 'value',
            action: 'updated',
            id: value.id,
            title: value.label,
          })
        }
      }
    } catch (err) {
      resultAction = `error: ${err instanceof Error ? err.message : String(err)}`
      results.push({
        entity: op.entity,
        action: resultAction,
        id: op.existingId || '',
        title: entityTitle,
      })
    }

    // Record the accepted suggestion with its result
    await prisma.briefingSuggestion.create({
      data: {
        sessionId: session.id,
        operationType: op.type,
        entityType: op.entity,
        entityTitle,
        reason: op.reason || null,
        proposedData: op.data as never,
        decision: 'ACCEPTED',
        rejectionReason: null,
        resultAction: resultAction || null,
        resultEntityId: resultEntityId || null,
      },
    })
  }

  // Process links
  if (links && Array.isArray(links)) {
    for (const link of links) {
      try {
        if (link.type === 'vehicleGoal') {
          let vehicleId = createdVehicles[link.vehicleTitle]
          if (!vehicleId) {
            const v = await prisma.vehicle.findFirst({
              where: { title: link.vehicleTitle },
            })
            if (v) vehicleId = v.id
          }
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

  return NextResponse.json({
    results,
    count: results.length,
    sessionId: session.id,
  })
}
