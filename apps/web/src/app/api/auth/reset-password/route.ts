import { prisma } from '@goalos/shared/lib/prisma'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { clientIp, rateLimit } from '@/lib/server/rate-limit'
import { validatePassword } from '@/lib/server/validation'

export async function POST(req: Request) {
  try {
    const limited = rateLimit(`reset-password:${clientIp(req)}`, {
      limit: 5,
      windowSeconds: 60,
    })
    if (limited) return limited

    const { token, password } = await req.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 }
      )
    }

    const pwError = validatePassword(password)
    if (pwError) {
      return NextResponse.json(pwError, { status: 400 })
    }

    const record = await prisma.verificationToken.findUnique({
      where: { token },
    })

    if (!record || !record.identifier.startsWith('reset:')) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    if (record.expires < new Date()) {
      await prisma.verificationToken.delete({
        where: {
          identifier_token: { identifier: record.identifier, token },
        },
      })
      return NextResponse.json(
        { error: 'Reset token has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    const email = record.identifier.replace('reset:', '')
    const hashed = await bcrypt.hash(password, 12)

    await prisma.user.update({
      where: { email },
      data: {
        password: hashed,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    })

    await prisma.verificationToken.delete({
      where: {
        identifier_token: { identifier: record.identifier, token },
      },
    })

    return NextResponse.json({ message: 'Password has been reset successfully.' })
  } catch {
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
