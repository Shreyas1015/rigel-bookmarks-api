/**
 * Unit tests — Cookie-header parser (utils, 100% coverage required).
 */
import { parseCookies } from '../../../src/utils/cookie.util.js'

describe('parseCookies', () => {
  it('returns {} for an undefined header', () => {
    expect(parseCookies(undefined)).toEqual({})
  })

  it('returns {} for an empty header', () => {
    expect(parseCookies('')).toEqual({})
  })

  it('parses a single cookie', () => {
    expect(parseCookies('refresh_token=abc.def')).toEqual({ refresh_token: 'abc.def' })
  })

  it('parses multiple cookies', () => {
    expect(parseCookies('a=1; b=2')).toEqual({ a: '1', b: '2' })
  })

  it('skips segments without an "="', () => {
    expect(parseCookies('a=1; junk; b=2')).toEqual({ a: '1', b: '2' })
  })

  it('skips segments with an empty name', () => {
    expect(parseCookies('=nope; a=1')).toEqual({ a: '1' })
  })

  it('URL-decodes values', () => {
    expect(parseCookies('t=a%20b')).toEqual({ t: 'a b' })
  })
})
