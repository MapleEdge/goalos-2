import { describe, expect, it, vi } from 'vitest'
import { errorResponse } from './response'
import { NotFoundError, ValidationError } from './types'

vi.mock('@goalos/shared/lib/logger', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

describe('errorResponse', () => {
  it('returns structured JSON for AppError subclasses', async () => {
    const res = errorResponse(new ValidationError('bad', { field: 'x' }), {
      requestId: 'req-1',
      endpoint: 'POST /test',
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.message).toBe('bad')
    expect(body.error.requestId).toBe('req-1')
    expect(body.error.details).toEqual({ field: 'x' })
  })

  it('returns 404 for NotFoundError', async () => {
    const res = errorResponse(new NotFoundError('Goal', '123'))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('returns 500 for unknown errors', async () => {
    const res = errorResponse(new Error('unexpected'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error.code).toBe('INTERNAL_ERROR')
    expect(body.error.message).toBe('unexpected')
  })

  it('returns 500 for non-Error values', async () => {
    const res = errorResponse('string error')
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error.code).toBe('INTERNAL_ERROR')
  })
})
