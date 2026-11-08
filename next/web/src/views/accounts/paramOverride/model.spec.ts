import { describe, expect, it } from 'vitest'
import {
  duplicateDraft,
  moveDraft,
  parseOverride,
  readOperation,
  readOverride,
  textToValue,
  validateOperation,
  valueToText,
  writeOverride
} from './model'

describe('param override model', () => {
  it('round-trips new-api operations, keeping keys it does not know', () => {
    const v = {
      operations: [
        { description: 'fix', mode: 'set', path: 'temperature', value: 0.7, keep_origin: true },
        { mode: 'set_header', path: 'anthropic-beta', value: { 'context-1m-2025-08-07': null, $append: ['x'] } },
        { mode: 'pass_headers', value: ['x-a', 'x-b'] },
        { mode: 'replace', path: 'model', from: 'a', to: '' },
        { mode: 'return_error', value: { message: 'no', status_code: 403, skip_retry: false } },
        {
          mode: 'delete',
          path: 'top_p',
          logic: 'AND',
          conditions: [{ path: 'model', mode: 'prefix', value: 'claude-', invert: true }],
          audit: 1
        }
      ]
    }
    expect(writeOverride(readOverride(v))).toEqual({
      operations: [
        v.operations[0],
        v.operations[1],
        v.operations[2],
        { mode: 'replace', path: 'model', from: 'a' },
        v.operations[4],
        v.operations[5]
      ]
    })
  })

  it('turns legacy keys into literal set operations that run first', () => {
    const drafts = readOverride({ 'a.b': 1, operations: [{ mode: 'delete', path: 'c' }] })
    expect(writeOverride(drafts)).toEqual({
      operations: [
        { mode: 'set', path: 'a\\.b', value: 1 },
        { mode: 'delete', path: 'c' }
      ]
    })
  })

  it('reads a value as JSON when it parses and quotes strings that would not read back', () => {
    expect(textToValue('0.7')).toBe(0.7)
    expect(textToValue('{"a":1}')).toEqual({ a: 1 })
    expect(textToValue('hello')).toBe('hello')
    expect(valueToText('123')).toBe('"123"')
    expect(valueToText('hello')).toBe('hello')
    expect(textToValue(valueToText('123'))).toBe('123')
  })

  it('accepts a string or comma list for pass_headers and a string return_error', () => {
    expect(readOperation({ mode: 'pass_headers', value: 'x-a, x-b' }).list).toEqual(['x-a', 'x-b'])
    expect(readOperation({ mode: 'return_error', value: 'blocked' }).error).toMatchObject({
      message: 'blocked',
      status_code: 400,
      skip_retry: true
    })
  })

  it('finds what the server would refuse', () => {
    const codes = (op: Record<string, unknown>) => validateOperation(readOperation(op)).map(p => `${p.field}:${p.code}`)
    expect(codes({ mode: 'set', path: 'a', value: 1 })).toEqual([])
    expect(codes({ mode: 'prune_objects' })).toEqual(['mode:unsupported'])
    expect(codes({ mode: 'set', value: '{"a":' })).toEqual(['path:required', 'value:invalid_json'])
    expect(codes({ mode: 'copy', from: 'a' })).toEqual(['to:required'])
    expect(codes({ mode: 'regex_replace', path: 'a', from: '(' })).toEqual(['from:invalid_regex'])
    expect(codes({ mode: 'set_header', path: 'bad header', value: 'v' })).toEqual(['path:invalid_header'])
    expect(codes({ mode: 'pass_headers', value: [] })).toEqual(['value:required'])
    expect(codes({ mode: 'return_error', value: { message: '', status_code: 99 } })).toEqual([
      'error.message:required',
      'error.status_code:status'
    ])
    expect(codes({ mode: 'delete', path: 'a', conditions: [{ path: '', value: '{' }] })).toEqual([
      'conditions.0.path:required',
      'conditions.0.value:invalid_json'
    ])
  })

  it('parses JSON text of an override', () => {
    expect(parseOverride('')).toEqual({ value: null })
    expect(parseOverride('{}')).toEqual({ value: null })
    expect(parseOverride('[]')).toEqual({ error: 'object' })
    expect(parseOverride('{"operations": 1}')).toEqual({ error: 'operations' })
    expect(parseOverride('{"temperature": 1}')).toEqual({ value: { temperature: 1 } })
    expect(parseOverride('{').error).toBeTruthy()
  })

  it('moves and duplicates drafts', () => {
    const list = readOverride({
      operations: [
        { mode: 'delete', path: 'a' },
        { mode: 'delete', path: 'b' }
      ]
    })
    expect(moveDraft(list, 0, 1).map(d => d.path)).toEqual(['b', 'a'])
    expect(moveDraft(list, 0, -1)).toBe(list)
    const copied = duplicateDraft(list, 0)
    expect(copied.map(d => d.path)).toEqual(['a', 'a', 'b'])
    expect(copied[1].id).not.toBe(copied[0].id)
  })
})
