import { randomBytes } from 'node:crypto'
import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'
import { sendPasswordResetEmail } from '@/lib/server/email'
import { clientIp, rateLimit } from '@/lib/server/rate-limit'
import { isValidEmail } from '@/lib/server/validation'

export async function POST(req: Request) {
  try {
    const limited = rateLimit(`forgot-password:${clientIp(req)}`, {
      limit: 3,
      windowSeconds: 60,
    })
    if (limited) return limited

    const { email } = await req.json()

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      )
    }

    // Always return the same response to prevent user enumeration.
    const genericResponse = NextResponse.json({
      message:
        'If an account with that email exists, a password reset link has been sent.',
    })

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return genericResponse

    // Re-use VerificationToken table with a "reset:" prefix on the identifier
    const token = randomBytes(32).toString('hex')
    await prisma.verificationToken.create({
      data: {
        identifier: `reset:${email}`,
        token,
        expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    })

    await sendPasswordResetEmail(email, token)

    return genericResponse
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
