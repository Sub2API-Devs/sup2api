import { describe, expect, it } from 'vitest'
import { parseModelListText } from './modelIds'

describe('parseModelListText', () => {
  it('reads a JSON array or plain separated ids', () => {
    expect(parseModelListText('["a-1", "b-2"]')).toEqual({ ids: ['a-1', 'b-2'] })
    expect(parseModelListText('a-1, b-2\nc-3')).toEqual({ ids: ['a-1', 'b-2', 'c-3'] })
    expect(parseModelListText('')).toEqual({ ids: [] })
  })
  it('reports what is wrong', () => {
    expect(parseModelListText('["a-1",')).toEqual({ problem: { kind: 'notArray' } })
    expect(parseModelListText('[1, 2]')).toEqual({ problem: { kind: 'notArray' } })
    expect(parseModelListText('["a-1", "a-1"]')).toEqual({ problem: { kind: 'duplicate', model: 'a-1' } })
    expect(parseModelListText('["claude-*"]')).toEqual({ problem: { kind: 'invalid', model: 'claude-*' } })
  })
})
