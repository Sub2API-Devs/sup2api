import { describe, expect, it } from 'vitest'
import { hexPreview, joinBytes, jsonlBlocks, looksBinary, prettyJSON, rewritten, searchQuery, shortId, sseBlocks, textOf, upstreamFacts, upstreamMissing, viewOf } from './requestLogViewer'

const enc = (s: string) => new TextEncoder().encode(s)

describe('request log viewer helpers', () => {
  it('chooses how a file is shown', () => {
    const view = (name: string, text: string) => viewOf(name, text, enc(text))
    expect(view('request.body', '{"model":"m"}')).toBe('json')
    expect(view('cli-stdout.jsonl', '{"a":1}\n{"b":2}\n')).toBe('jsonl')
    expect(view('response.body', 'event: message_start\ndata: {}\n\nevent: message_stop\ndata: {}\n\n')).toBe('sse')
    expect(view('notes.txt', 'plain text')).toBe('text')
    expect(viewOf('upstream.raw', '', new Uint8Array([0x1f, 0x8b, 0, 0, 0, 1, 2, 3]))).toBe('binary')
  })

  it('keeps multi-byte text whole across chunks', () => {
    const bytes = enc('好的，继续')
    const joined = joinBytes(bytes.subarray(0, 4), bytes.subarray(4))
    expect(textOf(joined)).toBe('好的，继续')
    expect(looksBinary(bytes)).toBe(false)
  })

  it('formats JSON, JSONL lines and SSE events', () => {
    expect(prettyJSON('{"a":1}')).toBe('{\n  "a": 1\n}')
    expect(prettyJSON('{"a":')).toBeNull()
    const lines = jsonlBlocks('{"type":"system","subtype":"init"}\nnot json\n')
    expect(lines.map(b => b.title)).toEqual(['#1 system/init', '#2'])
    expect(lines[1].body).toBe('not json')
    const events = sseBlocks('event: message_start\ndata: {"type":"message_start"}\n\ndata: tail\n\n')
    expect(events.map(e => e.title)).toEqual(['message_start', 'message'])
    expect(events[0].body).toContain('"type": "message_start"')
    expect(events[1].body).toBe('tail')
  })

  it('previews bytes as hex and shortens ids', () => {
    expect(hexPreview(new Uint8Array([0x41, 0x00]))).toBe('00000000  41 00' + ' '.repeat(42) + '  A.')
    expect(shortId('0123456789abcdef01234567')).toBe('012345…4567')
    expect(shortId('short')).toBe('short')
  })
})

describe('request log search', () => {
  const none = { mode: '', session: '', sha256: '', changed: '' } as const
  const sha = 'ab'.repeat(32)

  it('sends nothing when the Worker does not offer search', () => {
    expect(searchQuery({ mode: 'build', session: 'abc', sha256: sha, changed: 'true' }, false)).toEqual({ query: {}, invalid: [] })
  })

  it('builds the search query from valid filters only', () => {
    expect(searchQuery(none, true)).toEqual({ query: {}, invalid: [] })
    expect(searchQuery({ mode: 'direct', session: ' sess_A-1 ', sha256: ` ${sha.toUpperCase()} `, changed: 'false' }, true))
      .toEqual({ query: { mode: 'direct', session_id: 'sess_A-1', sha256: sha, changed: 'false' }, invalid: [] })
    expect(searchQuery({ ...none, changed: 'true' }, true).query).toEqual({ changed: 'true' })
  })

  it('reports malformed session ids and hashes', () => {
    expect(searchQuery({ ...none, session: 'has space' }, true)).toEqual({ query: {}, invalid: ['session_id'] })
    expect(searchQuery({ ...none, session: 'a'.repeat(129) }, true).invalid).toEqual(['session_id'])
    expect(searchQuery({ ...none, session: 'a'.repeat(128) }, true).query).toEqual({ session_id: 'a'.repeat(128) })
    expect(searchQuery({ ...none, sha256: sha.slice(1) }, true).invalid).toEqual(['sha256'])
    expect(searchQuery({ ...none, sha256: 'g' + sha.slice(1) }, true).invalid).toEqual(['sha256'])
    expect(searchQuery({ ...none, session: 'x/y', sha256: 'nope' }, true).invalid).toEqual(['session_id', 'sha256'])
  })

  it('marks a missing upstream record only on logs written with the capture', () => {
    expect(upstreamMissing({ mode: 'build', upstream_captured: false })).toBe(true)
    expect(upstreamMissing({ mode: 'direct', upstream_captured: true })).toBe(false)
    expect(upstreamMissing({ upstream_captured: false })).toBe(false)
    expect(upstreamMissing({})).toBe(false)
  })

  it('marks only direct requests as rewritten', () => {
    expect(rewritten({ mode: 'direct', body_changed: true })).toBe(true)
    expect(rewritten({ mode: 'direct', body_changed: false })).toBe(false)
    expect(rewritten({ mode: 'build', body_changed: true })).toBe(false)
    expect(rewritten({ body_changed: true })).toBe(false)
  })
})

describe('upstream request facts', () => {
  const sha = 'cd'.repeat(32)
  const upstream = {
    schema: 1, mode: 'build', attempts: 2, sent_at: '2026-10-26T01:02:03.456Z', method: 'POST', url: 'https://api.anthropic.com/v1/messages?beta=true',
    headers: { 'x-claude-code-session-id': 'cli-sess', 'Authorization': '[REDACTED]', 'anthropic-beta': 'a-1, b-2', 'x-claude-code-request-class': 'main', 'bad': 3 },
    body_encoding: 'identity', body_bytes: 1234, body_sha256: sha, model: 'claude-sonnet-4-6', stream: true
  }

  it('is null without an upstream request', () => {
    expect(upstreamFacts({ metadata: {} })).toBeNull()
    expect(upstreamFacts({ metadata: {}, upstream_request: null })).toBeNull()
    expect(upstreamFacts({ metadata: {}, upstream_request: [] as unknown as Record<string, unknown> })).toBeNull()
  })

  it('reads the facts and falls back to the sent headers', () => {
    const f = upstreamFacts({ metadata: { body_sha256: 'ab'.repeat(32), body_changed: true }, upstream_request: upstream })!
    expect(f).toMatchObject({ method: 'POST', attempts: 2, bodyBytes: 1234, bodySha256: sha, inputSha256: 'ab'.repeat(32), changed: true, model: 'claude-sonnet-4-6', stream: true, encoding: 'identity' })
    expect(f.betas).toEqual(['a-1', 'b-2'])
    expect(f.session).toBe('cli-sess')
    expect(f.requestClass).toBe('main')
    expect(f.headers.map(h => h.k)).toEqual(['anthropic-beta', 'authorization', 'x-claude-code-request-class', 'x-claude-code-session-id'])
    expect(f.headers.find(h => h.k === 'authorization')?.redacted).toBe(true)
    expect(f.headers.find(h => h.k === 'anthropic-beta')?.redacted).toBe(false)
  })

  it('prefers the flat metadata fields and drops malformed values', () => {
    const f = upstreamFacts({
      metadata: { upstream_betas: ['x'], upstream_session_id: 'meta-sess', upstream_request_class: 'subagent', body_sha256: 'short', body_changed: 'yes' },
      upstream_request: { ...upstream, attempts: 1.5, body_bytes: -1, body_sha256: 'zz', stream: 'true', method: 7 }
    })!
    expect(f).toMatchObject({ betas: ['x'], session: 'meta-sess', requestClass: 'subagent', attempts: null, bodyBytes: -1, bodySha256: '', inputSha256: '', changed: null, stream: null, method: '' })
  })

  it('reads header values as strings or string lists', () => {
    const f = upstreamFacts({ metadata: {}, upstream_request: { headers: { 'X-Api-Key': ['[REDACTED]'], 'accept': ['a', 'b'], 'empty': [], 'mixed': ['a', 1] } } })!
    expect(f.headers).toEqual([
      { k: 'accept', v: 'a, b', redacted: false },
      { k: 'x-api-key', v: '[REDACTED]', redacted: true }
    ])
  })
})
