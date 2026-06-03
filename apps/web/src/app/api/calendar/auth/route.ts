import { NextResponse } from 'next/server'
import { getConnector, getRedirectUri } from '@/lib/calendar'
import { requireAuthUserId } from '@/lib/server/auth'

export async function GET(request: Request) {
  await requireAuthUserId()
  const { searchParams } = new URL(request.url)
  const provider = searchParams.get('provider')?.toUpperCase()

  if (provider !== 'GOOGLE' && provider !== 'MICROSOFT') {
    return NextResponse.json(
      { error: "Invalid provider. Use 'google' or 'microsoft'" },
      { status: 400 }
    )
  }

  try {
    const connector = getConnector(provider)
    const redirectUri = getRedirectUri(provider)
    const authUrl = connector.getAuthUrl(redirectUri, provider)
    return NextResponse.json({ authUrl })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Configuration error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
