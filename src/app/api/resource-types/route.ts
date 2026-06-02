import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/session'

export async function GET() {
  const session = await requireSession()
  const types = await prisma.resourceType.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    include: { _count: { select: { flows: true } } },
  })
  return NextResponse.json(types)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { name, unit, icon, color, description } = body

  if (!name?.trim() || !unit?.trim()) {
    return NextResponse.json(
      { error: 'name and unit are required' },
      { status: 400 }
    )
  }

  const session = await requireSession()
  const type = await prisma.resourceType.create({
    data: {
      name: name.trim(),
      unit: unit.trim(),
      icon: icon || null,
      color: color || null,
      description: description || null,
      userId: session.user.id,
    },
  })
  return NextResponse.json(type, { status: 201 })
}
