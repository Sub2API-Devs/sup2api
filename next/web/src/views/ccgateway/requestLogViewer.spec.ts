import { describe, expect, it } from 'vitest'
import { hexPreview, joinBytes, jsonlBlocks, looksBinary, prettyJSON, shortId, sseBlocks, textOf, viewOf } from './requestLogViewer'

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
