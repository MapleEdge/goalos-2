import { generateRequestId } from '@goalos/shared/lib/logger'
import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'
import { withTransaction } from '@/lib/db/transaction'
import { trackError } from '@/lib/errors/monitoring'
import { errorResponse } from '@/lib/errors/response'
import { NotFoundError, ValidationError } from '@/lib/errors/types'
import { recordEventInTransaction } from '@/lib/events/store'
import { requireAuthUserId } from '@/lib/server/auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId()
  try {
    const userId = await requireAuthUserId()
    const { id } = await params
    const body = await request.json()

    const goal = await prisma.goal.findUnique({ where: { id, userId } })
    if (!goal) {
      throw new NotFoundError('Goal', id)
    }

    const action = body.action as string

    switch (action) {
      case 'complete_action': {
        await withTransaction(async (tx) => {
          const actionItem = await tx.action.update({
            where: { id: body.actionId },
            data: { status: 'DONE' },
          })
          await recordEventInTransaction(
            tx,
            'ACTION',
            actionItem.id,
            'STATUS_CHANGED',
            {
              from: 'TODO',
              to: 'DONE',
              goalId: id,
              title: actionItem.title,
            }
          )
        })
        break
      }

      case 'add_evidence': {
        await withTransaction(async (tx) => {
          const evidence = await tx.evidence.create({
            data: {
              title: body.title,
              description: body.description || null,
              source: body.source || null,
              prerequisiteId: body.prerequisiteId || null,
            },
          })
          await recordEventInTransaction(
            tx,
            'EVIDENCE',
            evidence.id,
            'CREATED',
            {
              goalId: id,
              title: evidence.title,
            }
          )
        })
        break
      }

      case 'add_note': {
        await withTransaction(async (tx) => {
          await recordEventInTransaction(tx, 'GOAL', id, 'NOTE_ADDED', {
            note: body.note,
          })
        })
        break
      }

      case 'update_stakeholder': {
        if (body.stakeholderId) {
          await withTransaction(async (tx) => {
            await tx.stakeholder.update({
              where: { id: body.stakeholderId },
              data: { lastInteraction: new Date(), notes: body.notes },
            })
            await recordEventInTransaction(
              tx,
              'STAKEHOLDER',
              body.stakeholderId,
              'INTERACTION_UPDATED',
              {
                goalId: id,
                notes: body.notes,
              }
            )
          })
        }
        break
      }

      case 'change_status': {
        await withTransaction(async (tx) => {
          await tx.goal.update({
            where: { id },
            data: {
              status: body.status,
              ...(body.status === 'COMPLETED'
                ? { completedAt: new Date() }
                : {}),
              ...(body.status !== 'COMPLETED' && goal.status === 'COMPLETED'
                ? { completedAt: null }
                : {}),
            },
          })
          await recordEventInTransaction(tx, 'GOAL', id, 'STATUS_CHANGED', {
            from: goal.status,
            to: body.status,
          })
        })
        break
      }

      default:
        throw new ValidationError(`Unknown action '${action}'`, {
          field: 'action',
        })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof NotFoundError) trackError('NOT_FOUND')
    else if (err instanceof ValidationError) trackError('VALIDATION_ERROR')
    else trackError('INTERNAL_ERROR')
    return errorResponse(err, {
      requestId,
      endpoint: 'POST /api/goals/[id]/progress',
    })
  }
}
