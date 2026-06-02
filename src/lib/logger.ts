import { randomUUID } from 'node:crypto'
import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: isDev
    ? {
        target: 'pino/file',
        options: { destination: 1 },
      }
    : undefined,
  formatters: {
    level(label) {
      return { level: label }
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
})

export default logger

/**
 * Generate a random request ID for tracing a single HTTP request across logs.
 */
export function generateRequestId(): string {
  return randomUUID()
}

/**
 * Create a child logger scoped to a single request.
 */
export function requestLogger(requestId: string, endpoint?: string) {
  return logger.child({ requestId, endpoint })
}
