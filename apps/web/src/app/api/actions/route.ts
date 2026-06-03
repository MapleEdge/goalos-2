import { generateRequestId } from '@goalos/shared/lib/logger'
import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'
import { withTransaction } from '@/lib/db/transaction'
import { trackError } from '@/lib/errors/monitoring'
import { errorResponse } from '@/lib/errors/response'
import { ValidationError } from '@/lib/errors/types'
import { recordEventInTransaction } from '@/lib/events/store'
import { requireAuthUserId } from '@/lib/server/auth'
import { withIdempotency } from '@/lib/utils/idempotency'

export async function GET() {
  const requestId = generateRequestId()
  try {
    const userId = await requireAuthUserId()
    const actions = await prisma.action.findMany({
      where: { goal: { userId } },
      include: { goal: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(actions)
  } catch (err) {
    trackError('INTERNAL_ERROR')
    return errorResponse(err, { requestId, endpoint: 'GET /api/actions' })
  }
}

export async function POST(request: Request) {
  const requestId = generateRequestId()
  const idempotencyKey = request.headers.get('Idempotency-Key')
  try {
    const userId = await requireAuthUserId()
    const body = await request.json()

    if (!body.title || typeof body.title !== 'string') {
      throw new ValidationError('title is required', { field: 'title' })
    }
    if (!body.goalId || typeof body.goalId !== 'string') {
      throw new ValidationError('goalId is required', { field: 'goalId' })
    }

    // Verify the goal belongs to the authenticated user
    const goal = await prisma.goal.findUnique({
      where: { id: body.goalId, userId },
    })
    if (!goal) {
      throw new ValidationError('Goal not found', { field: 'goalId' })
    }

    const { cached, response: action } = await withIdempotency(
      idempotencyKey,
      () =>
        withTransaction(async (tx) => {
          const created = await tx.action.create({
            data: {
              title: body.title,
              status: body.status || 'TODO',
              priority: body.priority || 'MEDIUM',
              dueDate: body.dueDate ? new Date(body.dueDate) : null,
              goalId: body.goalId,
            },
          })

          await recordEventInTransaction(tx, 'ACTION', created.id, 'CREATED', {
            title: created.title,
            goalId: created.goalId,
          })

          return created
        })
    )

    return NextResponse.json(action, { status: cached ? 200 : 201 })
  } catch (err) {
    trackError(
      err instanceof ValidationError ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR'
    )
    return errorResponse(err, { requestId, endpoint: 'POST /api/actions' })
  }
}
