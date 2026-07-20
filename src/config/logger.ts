import pino from 'pino'
import { trace } from '@opentelemetry/api'
import { createRequire } from 'node:module'
import { env } from './env.js'

const require = createRequire(import.meta.url)
const tryResolve = (m: string): boolean => {
  try {
    require.resolve(m)
    return true
  } catch {
    return false
  }
}
// pino-pretty is a devDependency — absent after `npm ci --omit=dev`. Guard so prod logs JSON.
const usePretty = env.NODE_ENV !== 'production' && tryResolve('pino-pretty')

export const logger = pino({
  level: env.LOG_LEVEL,
  // Deterministic trace↔log correlation, independent of auto-instrumentation patching.
  mixin() {
    const span = trace.getActiveSpan()
    if (!span) return {}
    const { traceId, spanId } = span.spanContext()
    return { trace_id: traceId, span_id: spanId }
  },
  ...(usePretty ? { transport: { target: 'pino-pretty', options: { colorize: true } } } : {}),
})
