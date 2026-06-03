import { randomBytes } from 'node:crypto'
import { prisma } from '@goalos/shared/lib/prisma'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { sendVerificationEmail } from '@/lib/server/email'
import { clientIp, rateLimit } from '@/lib/server/rate-limit'
import { isValidEmail, validatePassword } from '@/lib/server/validation'

export async function POST(req: Request) {
  try {
    const limited = rateLimit(`signup:${clientIp(req)}`, {
      limit: 5,
      windowSeconds: 60,
    })
    if (limited) return limited

    const { name, email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      )
    }

    const pwError = validatePassword(password)
    if (pwError) {
      return NextResponse.json(pwError, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      // Return same shape to prevent user enumeration
      return NextResponse.json(
        {
          message:
            'If this email is not already registered, a verification email has been sent.',
        },
        { status: 200 }
      )
    }

    const hashed = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { name: name || null, email, password: hashed },
    })

    // Create email verification token
    const token = randomBytes(32).toString('hex')
    await prisma.verificationToken.create({
      data: {
        identifier: user.email,
        token,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    })

    await sendVerificationEmail(user.email, token)

    return NextResponse.json(
      {
        message:
          'If this email is not already registered, a verification email has been sent.',
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
