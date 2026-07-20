import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { env } from '../config/env.js'

let sdk: NodeSDK | undefined

export async function startTelemetry(): Promise<void> {
  const endpoint = env.OTEL_EXPORTER_OTLP_ENDPOINT
  if (!endpoint) return // no-op when unset (tests, CI, local-without-backend)

  // service.name / service.version are picked up automatically from the standard
  // OTEL_SERVICE_NAME and OTEL_RESOURCE_ATTRIBUTES env vars (set in .env / docker-compose) —
  // no manual Resource needed, so no @opentelemetry/resources / semantic-conventions imports.
  sdk = new NodeSDK({
    // Traces → collector. Note the plural option names and the /v1/* path suffixes.
    traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
    metricReaders: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: `${endpoint}/v1/metrics` }),
        exportIntervalMillis: env.OTEL_METRIC_EXPORT_INTERVAL_MS,
      }),
    ],
    instrumentations: [getNodeAutoInstrumentations()],
  })
  await sdk.start()
}

export async function shutdownTelemetry(): Promise<void> {
  await sdk?.shutdown()
}
