const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Validate that a string looks like a well-formed email address.
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email)
}

interface PasswordError {
  error: string
}

/**
 * Validate a password against strength requirements. Returns null if valid,
 * or an object with an error message if invalid.
 */
export function validatePassword(password: string): PasswordError | null {
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters' }
  }
  if (!/[a-z]/.test(password)) {
    return { error: 'Password must include at least one lowercase letter' }
  }
  if (!/[A-Z]/.test(password)) {
    return { error: 'Password must include at least one uppercase letter' }
  }
  if (!/\d/.test(password)) {
    return { error: 'Password must include at least one digit' }
  }
  return null
}
