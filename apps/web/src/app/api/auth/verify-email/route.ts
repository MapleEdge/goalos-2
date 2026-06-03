import { prisma } from '@goalos/shared/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json(
      { error: 'Missing verification token' },
      { status: 400 }
    )
  }

  const record = await prisma.verificationToken.findUnique({
    where: { token },
  })

  if (!record) {
    return NextResponse.json(
      { error: 'Invalid or expired verification token' },
      { status: 400 }
    )
  }

  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({
      where: { identifier_token: { identifier: record.identifier, token } },
    })
    return NextResponse.json(
      { error: 'Verification token has expired. Please sign up again.' },
      { status: 400 }
    )
  }

  await prisma.user.update({
    where: { email: record.identifier },
    data: { emailVerified: new Date() },
  })

  await prisma.verificationToken.delete({
    where: { identifier_token: { identifier: record.identifier, token } },
  })

  // Redirect to login with a success message
  return NextResponse.redirect(
    new URL('/login?verified=true', req.url)
  )
}
