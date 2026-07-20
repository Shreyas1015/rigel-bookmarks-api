/**
 * Minimal Cookie-header parser (utils layer — no domain imports). Avoids pulling in a
 * cookie-parser dependency just to read one httpOnly cookie back off the request.
 */

/** Parse a raw `Cookie` request header into a name→value map. */
export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const name = part.slice(0, idx).trim()
    if (!name) continue
    out[name] = decodeURIComponent(part.slice(idx + 1).trim())
  }
  return out
}
