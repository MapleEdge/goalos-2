import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'

// Import GoalOS actions with due dates as schedule events
export async function POST() {
  const actions = await prisma.action.findMany({
    where: {
      dueDate: { not: null },
      status: { in: ['TODO', 'IN_PROGRESS'] },
    },
    include: { goal: { select: { title: true } } },
  })

  let imported = 0
  for (const action of actions) {
    if (!action.dueDate) continue

    const existing = await prisma.scheduleEvent.findFirst({
      where: { actionId: action.id, source: 'GOALOS' },
    })

    if (!existing) {
      const startTime = new Date(action.dueDate)
      startTime.setHours(9, 0, 0, 0)
      const endTime = new Date(action.dueDate)
      endTime.setHours(10, 0, 0, 0)

      await prisma.scheduleEvent.create({
        data: {
          title: action.title,
          description: action.goal ? `Goal: ${action.goal.title}` : undefined,
          startTime,
          endTime,
          source: 'GOALOS',
          actionId: action.id,
          goalId: action.goalId,
          color:
            action.priority === 'HIGH' || action.priority === 'CRITICAL'
              ? '#ef4444'
              : '#3b82f6',
        },
      })
      imported++
    }
  }

  // Also import goal target dates
  const goals = await prisma.goal.findMany({
    where: {
      targetDate: { not: null },
      status: { in: ['ACTIVE', 'BLOCKED', 'WAITING'] },
    },
  })

  for (const goal of goals) {
    if (!goal.targetDate) continue

    const existing = await prisma.scheduleEvent.findFirst({
      where: { goalId: goal.id, actionId: null, source: 'GOALOS' },
    })

    if (!existing) {
      await prisma.scheduleEvent.create({
        data: {
          title: `Target: ${goal.title}`,
          description: goal.description || undefined,
          startTime: goal.targetDate,
          endTime: goal.targetDate,
          allDay: true,
          source: 'GOALOS',
          goalId: goal.id,
          color: '#f59e0b',
        },
      })
      imported++
    }
  }

  return NextResponse.json({ imported })
}
