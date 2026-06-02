import { NextResponse } from 'next/server'
import { allConnectors } from '@/lib/connectors/mock'

export async function GET() {
  const connectors = allConnectors.map((c) => ({
    name: c.name,
    configured: c.isConfigured(),
  }))
  return NextResponse.json(connectors)
}

export async function POST(request: Request) {
  const body = await request.json()
  const connector = allConnectors.find((c) => c.name === body.connector)

  if (!connector) {
    return NextResponse.json(
      { error: `Connector "${body.connector}" not found` },
      { status: 404 }
    )
  }

  const items = await connector.import()
  return NextResponse.json({
    connector: connector.name,
    imported: items.length,
    items,
  })
}
