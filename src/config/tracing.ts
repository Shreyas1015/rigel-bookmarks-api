import { trace, SpanStatusCode, type Attributes } from '@opentelemetry/api'

const tracer = trace.getTracer('app')

/** Wrap a unit of work in a span. No-op (zero overhead) when no SDK is started. */
export async function withSpan<T>(
  name: string,
  attrs: Attributes,
  fn: () => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    span.setAttributes(attrs)
    try {
      return await fn()
    } catch (err) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (err as Error).message })
      span.recordException(err as Error)
      throw err
    } finally {
      span.end()
    }
  })
}
