import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM_EMAIL = process.env.EMAIL_FROM || 'GoalOS <noreply@goalos.app>'

function getAppBaseUrl(): string {
  return process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'http://localhost:3000'
}

export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<void> {
  const url = `${getAppBaseUrl()}/api/auth/verify-email?token=${token}`

  if (!resend) {
    console.log(`[DEV] Email verification link for ${email}: ${url}`)
    return
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Verify your GoalOS account',
    html: `
      <h2>Welcome to GoalOS</h2>
      <p>Click the link below to verify your email address:</p>
      <p><a href="${url}">Verify Email</a></p>
      <p>This link expires in 24 hours.</p>
      <p>If you didn't create an account, you can ignore this email.</p>
    `,
  })
}

export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<void> {
  const url = `${getAppBaseUrl()}/reset-password?token=${token}`

  if (!resend) {
    console.log(`[DEV] Password reset link for ${email}: ${url}`)
    return
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Reset your GoalOS password',
    html: `
      <h2>Password Reset</h2>
      <p>Click the link below to reset your password:</p>
      <p><a href="${url}">Reset Password</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request a password reset, you can ignore this email.</p>
    `,
  })
}
