import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const types = await prisma.resourceType.findMany({
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

  const type = await prisma.resourceType.create({
    data: {
      name: name.trim(),
      unit: unit.trim(),
      icon: icon || null,
      color: color || null,
      description: description || null,
    },
  })
  return NextResponse.json(type, { status: 201 })
}
