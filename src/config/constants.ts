/**
 * App-wide constants (config layer). Products extend these with domain constants
 * (e.g. VALID_TRANSITIONS state machines).
 */

/**
 * Compiled-in feature-flag defaults. `providers/featureFlags.ts` falls back to these
 * when Redis holds no override. Products add flags here.
 */
export const FEATURE_FLAG_DEFAULTS = {} as const

/** Cursor-pagination page-size bounds (base64url cursors — see .claude/rules/api.md). */
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100
