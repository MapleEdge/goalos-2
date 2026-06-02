import { NextResponse } from 'next/server'
import { getConnector, getRedirectUri } from '@/lib/calendar'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/session'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      new URL(`/schedule?error=${encodeURIComponent(error)}`, request.url)
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/schedule?error=missing_code', request.url)
    )
  }

  try {
    const connector = getConnector('MICROSOFT')
    const redirectUri = getRedirectUri('MICROSOFT')
    const tokens = await connector.exchangeCode(code, redirectUri)

    // Get user email from Graph API
    const meRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    })
    const me = await meRes.json()
    const email = me.mail || me.userPrincipalName || 'unknown@outlook.com'

    // Get default calendar
    const calRes = await fetch('https://graph.microsoft.com/v1.0/me/calendar', {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    })
    const calData = await calRes.json()

    const session = await requireSession()
    await prisma.calendarConnection.upsert({
      where: {
        provider_accountEmail: { provider: 'MICROSOFT', accountEmail: email },
      },
      create: {
        provider: 'MICROSOFT',
        accountEmail: email,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || null,
        tokenExpiry: tokens.expiresAt,
        calendarId: calData.id || null,
        userId: session.user.id,
      },
      update: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || undefined,
        tokenExpiry: tokens.expiresAt,
        calendarId: calData.id || undefined,
      },
    })

    return NextResponse.redirect(
      new URL('/schedule?connected=microsoft', request.url)
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'OAuth failed'
    return NextResponse.redirect(
      new URL(`/schedule?error=${encodeURIComponent(message)}`, request.url)
    )
  }
}
