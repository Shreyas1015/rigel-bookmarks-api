import { startTelemetry, shutdownTelemetry } from '../providers/telemetry.js'
import { env } from '../config/env.js'
import { logger } from '../config/logger.js'

async function main(): Promise<void> {
  await startTelemetry() // 1. patch instrumented libs before they load
  const { app } = await import('./app.js') // 2. dynamic import AFTER sdk.start()

  const server = app.listen(env.PORT, () => logger.info({ event: 'server.start', port: env.PORT }))

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ event: 'server.shutdown', signal })
    server.close()
    await shutdownTelemetry() // flush spans/metrics before exit
    process.exit(0)
  }
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))
}

void main()
