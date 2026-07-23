/**
 * Shared cross-entity types (Types layer — zero imports from other layers except zod).
 * Cursor pagination shapes used by every list endpoint (see .claude/rules/api.md):
 * cursors key on `(createdAt, id)` and are carried over the wire as base64url JSON.
 */
import { z } from 'zod'

/** Keyset cursor for `(createdAt, id)` DESC pagination. `createdAt` is an ISO timestamp. */
export const PageCursorSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
})
export type PageCursor = z.infer<typeof PageCursorSchema>

/** A page of results: the items, the cursor for the next page (null when exhausted), hasMore. */
export interface PageResult<T> {
  items: T[]
  nextCursor: PageCursor | null
  hasMore: boolean
}
