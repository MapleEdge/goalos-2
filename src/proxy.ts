import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const publicPaths = ['/login', '/register', '/api/auth']

function isPublicPath(pathname: string) {
  return publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths and static assets
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // Check for session cookie (Better Auth uses goalos.session_token)
  const sessionCookie =
    request.cookies.get('goalos.session_token') ??
    request.cookies.get('better-auth.session_token')

  if (!sessionCookie?.value) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
