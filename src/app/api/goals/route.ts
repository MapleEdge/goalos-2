import { NextResponse } from 'next/server'
import { withTransaction } from '@/lib/db/transaction'
import { trackError } from '@/lib/errors/monitoring'
import { errorResponse } from '@/lib/errors/response'
import { ValidationError } from '@/lib/errors/types'
import { recordEventInTransaction } from '@/lib/events/store'
import { generateRequestId } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { withIdempotency } from '@/lib/utils/idempotency'

export async function GET() {
  const requestId = generateRequestId()
  try {
    const goals = await prisma.goal.findMany({
      include: {
        prerequisites: { include: { evidence: true } },
        actions: true,
        value: { select: { id: true, label: true, rank: true } },
        values: { select: { id: true, label: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(goals)
  } catch (err) {
    trackError('INTERNAL_ERROR')
    return errorResponse(err, { requestId, endpoint: 'GET /api/goals' })
  }
}

export async function POST(request: Request) {
  const requestId = generateRequestId()
  const idempotencyKey = request.headers.get('Idempotency-Key')
  try {
    const body = await request.json()

    if (!body.title || typeof body.title !== 'string') {
      throw new ValidationError('title is required', { field: 'title' })
    }

    const { cached, response: goal } = await withIdempotency(
      idempotencyKey,
      () =>
        withTransaction(async (tx) => {
          const created = await tx.goal.create({
            data: {
              title: body.title,
              description: body.description,
              targetDate: body.targetDate ? new Date(body.targetDate) : null,
              successCriteria: body.successCriteria,
              status: body.status || 'ACTIVE',
              valueId: body.valueId || null,
              ...(body.valueIds?.length
                ? {
                    values: {
                      connect: body.valueIds.map((id: string) => ({ id })),
                    },
                  }
                : {}),
            },
          })

          await recordEventInTransaction(tx, 'GOAL', created.id, 'CREATED', {
            title: created.title,
            status: created.status,
          })

          return created
        })
    )

    return NextResponse.json(goal, { status: cached ? 200 : 201 })
  } catch (err) {
    trackError(
      err instanceof ValidationError ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR'
    )
    return errorResponse(err, { requestId, endpoint: 'POST /api/goals' })
  }
}
