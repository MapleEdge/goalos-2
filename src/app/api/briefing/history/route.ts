import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const sessions = await prisma.briefingSession.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      suggestions: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  return NextResponse.json({ sessions })
}
