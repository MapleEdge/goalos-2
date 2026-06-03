import { randomBytes } from 'node:crypto'
import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'
import { sendVerificationEmail } from '@/lib/server/email'
import { clientIp, rateLimit } from '@/lib/server/rate-limit'

export async function POST(req: Request) {
  const limited = rateLimit(`resend-verify:${clientIp(req)}`, {
    limit: 3,
    windowSeconds: 60,
  })
  if (limited) return limited

  const { email } = await req.json()
  if (!email || typeof email !== 'string') {
    return NextResponse.json(
      { error: 'Email is required' },
      { status: 400 }
    )
  }

  const user = await prisma.user.findUnique({ where: { email } })

  // Always return success to prevent user enumeration
  if (!user || user.emailVerified) {
    return NextResponse.json({ message: 'If an unverified account exists, a new verification email has been sent.' })
  }

  // Delete any existing tokens for this user
  await prisma.verificationToken.deleteMany({
    where: { identifier: email },
  })

  // Create new token
  const token = randomBytes(32).toString('hex')
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  })

  await sendVerificationEmail(email, token)

  return NextResponse.json({ message: 'If an unverified account exists, a new verification email has been sent.' })
}
