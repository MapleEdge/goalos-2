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
    const connector = getConnector('GOOGLE')
    const redirectUri = getRedirectUri('GOOGLE')
    const tokens = await connector.exchangeCode(code, redirectUri)

    // Get user email
    const userInfoRes = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      { headers: { Authorization: `Bearer ${tokens.accessToken}` } }
    )
    const userInfo = await userInfoRes.json()
    const email = userInfo.email || 'unknown@gmail.com'

    const session = await requireSession()
    await prisma.calendarConnection.upsert({
      where: {
        provider_accountEmail: { provider: 'GOOGLE', accountEmail: email },
      },
      create: {
        provider: 'GOOGLE',
        accountEmail: email,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || null,
        tokenExpiry: tokens.expiresAt,
        calendarId: 'primary',
        userId: session.user.id,
      },
      update: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || undefined,
        tokenExpiry: tokens.expiresAt,
      },
    })

    return NextResponse.redirect(
      new URL('/schedule?connected=google', request.url)
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'OAuth failed'
    return NextResponse.redirect(
      new URL(`/schedule?error=${encodeURIComponent(message)}`, request.url)
    )
  }
}
