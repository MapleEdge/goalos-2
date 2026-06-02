import { describe, expect, it } from 'vitest'
import {
  AppError,
  ConflictError,
  ErrorCode,
  ExternalServiceError,
  NotFoundError,
  ValidationError,
} from './types'

describe('AppError', () => {
  it('stores code, statusCode and optional details', () => {
    const err = new AppError(ErrorCode.INTERNAL_ERROR, 'boom', 500, {
      foo: 1,
    })
    expect(err.code).toBe('INTERNAL_ERROR')
    expect(err.statusCode).toBe(500)
    expect(err.message).toBe('boom')
    expect(err.details).toEqual({ foo: 1 })
    expect(err).toBeInstanceOf(Error)
  })
})

describe('ValidationError', () => {
  it('maps to 400', () => {
    const err = new ValidationError('bad input', { field: 'title' })
    expect(err.statusCode).toBe(400)
    expect(err.code).toBe('VALIDATION_ERROR')
    expect(err.details).toEqual({ field: 'title' })
  })
})

describe('NotFoundError', () => {
  it('maps to 404 with entity context', () => {
    const err = new NotFoundError('Goal', 'abc-123')
    expect(err.statusCode).toBe(404)
    expect(err.message).toBe("Goal 'abc-123' not found")
    expect(err.details).toEqual({ entity: 'Goal', id: 'abc-123' })
  })

  it('works without id', () => {
    const err = new NotFoundError('Action')
    expect(err.message).toBe('Action not found')
  })
})

describe('ConflictError', () => {
  it('maps to 409', () => {
    const err = new ConflictError('duplicate key')
    expect(err.statusCode).toBe(409)
    expect(err.code).toBe('CONFLICT')
  })
})

describe('ExternalServiceError', () => {
  it('maps to 503 with service name', () => {
    const err = new ExternalServiceError('Gemini', 'timeout')
    expect(err.statusCode).toBe(503)
    expect(err.code).toBe('EXTERNAL_SERVICE_UNAVAILABLE')
    expect(err.details).toEqual({ service: 'Gemini', cause: 'timeout' })
  })
})
