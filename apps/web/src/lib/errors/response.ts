import logger from '@goalos/shared/lib/logger'
import { NextResponse } from 'next/server'
import { AppError, ErrorCode } from './types'

export interface ErrorResponseBody {
  error: {
    code: ErrorCode
    message: string
    details?: Record<string, unknown>
    requestId?: string
  }
}

/**
 * Convert an error into a standardised JSON response.
 * `AppError` subclasses carry their own status code; anything else maps to 500.
 */
export function errorResponse(
  err: unknown,
  meta?: { requestId?: string; endpoint?: string }
): NextResponse<ErrorResponseBody> {
  if (err instanceof AppError) {
    logger.error(
      { code: err.code, endpoint: meta?.endpoint, requestId: meta?.requestId },
      err.message
    )
    return NextResponse.json(
      {
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
          requestId: meta?.requestId,
        },
      },
      { status: err.statusCode }
    )
  }

  const message = err instanceof Error ? err.message : 'Internal server error'
  logger.error(
    {
      err,
      endpoint: meta?.endpoint,
      requestId: meta?.requestId,
    },
    message
  )

  return NextResponse.json(
    {
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message,
        requestId: meta?.requestId,
      },
    },
    { status: 500 }
  )
}
