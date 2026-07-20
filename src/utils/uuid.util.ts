/** Time-ordered UUIDv7 generator — sortable primary keys (utils layer, no domain imports). */
import { v7 as uuidv7 } from 'uuid'

export function newId(): string {
  return uuidv7()
}
