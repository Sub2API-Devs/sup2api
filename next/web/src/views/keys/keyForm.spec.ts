import { describe, expect, it } from 'vitest'
import type { Group } from '@/api/types'
import { groupOptions, ipEntries } from './keyForm'

describe('API key form', () => {
  it('offers each group by its name, the rate of the caller there and the platforms its keys reach', () => {
    const groups = [
      { id: 1, name: 'default', rate_multiplier: '1', effective_rate: '0.9', platforms: ['anthropic', 'openai'] },
      { id: 2, name: 'empty', rate_multiplier: '1', platforms: [] },
      { id: 3, name: 'unknown', rate_multiplier: '1.5' },
      { id: 4, name: 'vip', rate_multiplier: '0.8', effective_rate: '0.72', exclusive: true, platforms: ['anthropic'] }
    ] as Group[]
    expect(groupOptions(groups, id => id.toUpperCase(), 'exclusive')).toEqual([
      { value: 1, label: 'default · ×0.9 · ANTHROPIC, OPENAI' },
      { value: 2, label: 'empty · ×1' },
      { value: 3, label: 'unknown · ×1.5' },
      { value: 4, label: 'vip · ×0.72 · exclusive · ANTHROPIC' }
    ])
  })

  it('reads IP entries separated by lines, spaces or commas', () => {
    expect(ipEntries(' 192.0.2.7,\n2001:db8::/32  10.0.0.0/8\n')).toEqual(['192.0.2.7', '2001:db8::/32', '10.0.0.0/8'])
    expect(ipEntries('')).toEqual([])
  })
})
