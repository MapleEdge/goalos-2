import { NextResponse } from 'next/server'
import { recordEvent } from '@/lib/events/store'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/session'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = await request.json()

    const goal = await prisma.goal.findUnique({ where: { id, userId: session.user.id } })
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    const action = body.action as string

    switch (action) {
      case 'complete_action': {
        const actionItem = await prisma.action.update({
          where: { id: body.actionId },
          data: { status: 'DONE' },
        })
        await recordEvent('ACTION', actionItem.id, 'STATUS_CHANGED', {
          from: 'TODO',
          to: 'DONE',
          goalId: id,
          title: actionItem.title,
        })
        break
      }

      case 'add_evidence': {
        const evidence = await prisma.evidence.create({
          data: {
            title: body.title,
            description: body.description || null,
            source: body.source || null,
            prerequisiteId: body.prerequisiteId || null,
          },
        })
        await recordEvent('EVIDENCE', evidence.id, 'CREATED', {
          goalId: id,
          title: evidence.title,
        })
        break
      }

      case 'add_note': {
        await recordEvent('GOAL', id, 'NOTE_ADDED', {
          note: body.note,
        })
        break
      }

      case 'update_stakeholder': {
        if (body.stakeholderId) {
          await prisma.stakeholder.update({
            where: { id: body.stakeholderId },
            data: { lastInteraction: new Date(), notes: body.notes },
          })
          await recordEvent(
            'STAKEHOLDER',
            body.stakeholderId,
            'INTERACTION_UPDATED',
            {
              goalId: id,
              notes: body.notes,
            }
          )
        }
        break
      }

      case 'change_status': {
        await prisma.goal.update({
          where: { id },
          data: {
            status: body.status,
            ...(body.status === 'COMPLETED' ? { completedAt: new Date() } : {}),
            ...(body.status !== 'COMPLETED' && goal.status === 'COMPLETED'
              ? { completedAt: null }
              : {}),
          },
        })
        await recordEvent('GOAL', id, 'STATUS_CHANGED', {
          from: goal.status,
          to: body.status,
        })
        break
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
