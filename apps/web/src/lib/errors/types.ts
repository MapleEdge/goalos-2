// ── Error codes ─────────────────────────────────────────────────

export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  EXTERNAL_SERVICE_UNAVAILABLE: 'EXTERNAL_SERVICE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
} as const

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]

// ── Base error class ────────────────────────────────────────────

export class AppError extends Error {
  readonly code: ErrorCode
  readonly statusCode: number
  readonly details?: Record<string, unknown>

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

// ── Specific error types ────────────────────────────────────────

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.VALIDATION_ERROR, message, 400, details)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id?: string) {
    const message = id ? `${entity} '${id}' not found` : `${entity} not found`
    super(ErrorCode.NOT_FOUND, message, 404, { entity, id })
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.CONFLICT, message, 409, details)
    this.name = 'ConflictError'
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, cause?: string) {
    super(
      ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
      `External service '${service}' is unavailable`,
      503,
      { service, cause }
    )
    this.name = 'ExternalServiceError'
  }
}
