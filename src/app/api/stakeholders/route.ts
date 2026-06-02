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
    const stakeholders = await prisma.stakeholder.findMany({
      include: { evidence: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(stakeholders)
  } catch (err) {
    trackError('INTERNAL_ERROR')
    return errorResponse(err, {
      requestId,
      endpoint: 'GET /api/stakeholders',
    })
  }
}

export async function POST(request: Request) {
  const requestId = generateRequestId()
  const idempotencyKey = request.headers.get('Idempotency-Key')
  try {
    const body = await request.json()

    if (!body.name || typeof body.name !== 'string') {
      throw new ValidationError('name is required', { field: 'name' })
    }

    const { cached, response: stakeholder } = await withIdempotency(
      idempotencyKey,
      () =>
        withTransaction(async (tx) => {
          const created = await tx.stakeholder.create({
            data: {
              name: body.name,
              organization: body.organization,
              role: body.role,
              relationshipStrength: body.relationshipStrength ?? 0,
              lastInteraction: body.lastInteraction
                ? new Date(body.lastInteraction)
                : null,
              notes: body.notes,
              capabilities: body.capabilities ?? undefined,
              valueExchangeAssets: body.valueExchangeAssets ?? undefined,
              userAssets: body.userAssets ?? undefined,
            },
          })

          await recordEventInTransaction(
            tx,
            'STAKEHOLDER',
            created.id,
            'CREATED',
            { name: created.name }
          )

          return created
        })
    )

    return NextResponse.json(stakeholder, { status: cached ? 200 : 201 })
  } catch (err) {
    trackError(
      err instanceof ValidationError ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR'
    )
    return errorResponse(err, {
      requestId,
      endpoint: 'POST /api/stakeholders',
    })
  }
}
