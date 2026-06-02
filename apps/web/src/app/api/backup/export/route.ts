import { generateRequestId } from '@goalos/shared/lib/logger'
import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'
import { trackError } from '@/lib/errors/monitoring'
import { errorResponse } from '@/lib/errors/response'

/**
 * GET /api/backup/export
 *
 * Returns a full snapshot of every user-data table as JSON.
 * The response is a single object keyed by table name — suitable for
 * downloading as a file or uploading to cloud storage for backup.
 */
export async function GET() {
  const requestId = generateRequestId()
  try {
    const [
      values,
      goals,
      stakeholders,
      prerequisites,
      evidence,
      actions,
      relationships,
      vehicles,
      vehicleGoals,
      opportunities,
      controlDimensions,
      calendarConnections,
      scheduleEvents,
      resourceTypes,
      resourceFlows,
      events,
    ] = await Promise.all([
      prisma.value.findMany({ orderBy: { rank: 'asc' } }),
      prisma.goal.findMany({
        include: { values: { select: { id: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.stakeholder.findMany({
        include: { values: { select: { id: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.prerequisite.findMany({
        include: { values: { select: { id: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.evidence.findMany({
        include: { values: { select: { id: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.action.findMany({
        include: { values: { select: { id: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.relationship.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.vehicle.findMany({
        include: { values: { select: { id: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.vehicleGoal.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.opportunity.findMany({
        include: { values: { select: { id: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.controlDimension.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.calendarConnection.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.scheduleEvent.findMany({
        include: { values: { select: { id: true } } },
        orderBy: { startTime: 'asc' },
      }),
      prisma.resourceType.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.resourceFlow.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.event.findMany({ orderBy: { occurredAt: 'asc' } }),
    ])

    const snapshot = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        values,
        goals,
        stakeholders,
        prerequisites,
        evidence,
        actions,
        relationships,
        vehicles,
        vehicleGoals,
        opportunities,
        controlDimensions,
        calendarConnections,
        scheduleEvents,
        resourceTypes,
        resourceFlows,
        events,
      },
    }

    return NextResponse.json(snapshot)
  } catch (err) {
    trackError('INTERNAL_ERROR')
    return errorResponse(err, { requestId, endpoint: 'GET /api/backup/export' })
  }
}
