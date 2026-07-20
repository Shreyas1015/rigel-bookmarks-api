import { redis } from './redis.js'
import { FEATURE_FLAG_DEFAULTS } from '../config/constants.js'

/** True when the flag is enabled. Redis override wins; otherwise the compiled-in default. */
export async function isEnabled(flag: keyof typeof FEATURE_FLAG_DEFAULTS): Promise<boolean> {
  const override = await redis.hget('feature_flags', flag)
  if (override !== null) return override === 'true'
  return FEATURE_FLAG_DEFAULTS[flag] ?? false
}
