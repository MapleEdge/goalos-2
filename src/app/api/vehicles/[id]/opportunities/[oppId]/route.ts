import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; oppId: string }> }
) {
  const { oppId } = await params
  const body = await request.json()

  const opportunity = await prisma.opportunity.update({
    where: { id: oppId },
    data: {
      title: body.title,
      description: body.description,
      realized: body.realized,
      realizedAt: body.realized ? new Date() : null,
    },
  })

  return NextResponse.json(opportunity)
}
