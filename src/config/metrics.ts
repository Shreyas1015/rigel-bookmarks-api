import { metrics, type Attributes } from '@opentelemetry/api'

const meter = metrics.getMeter('app')
// Lazily created instruments; all are no-ops until an SDK MeterProvider is registered.
const counters = new Map<string, ReturnType<typeof meter.createCounter>>()

export function increment(name: string, attrs: Attributes = {}, by = 1): void {
  let c = counters.get(name)
  if (!c) {
    c = meter.createCounter(name)
    counters.set(name, c)
  }
  c.add(by, attrs)
}

export const httpRequestDuration = meter.createHistogram('http.server.duration', { unit: 'ms' })
