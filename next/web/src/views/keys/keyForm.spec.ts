import { describe, expect, it } from 'vitest'
import type { Group } from '@/api/types'
import { groupOptions, ipEntries } from './keyForm'

describe('API key form', () => {
  it('offers each group by its name and the platforms its keys reach', () => {
    const groups = [
      { id: 1, name: 'default', platforms: ['anthropic', 'openai'] },
      { id: 2, name: 'empty', platforms: [] },
      { id: 3, name: 'unknown' }
    ] as Group[]
    expect(groupOptions(groups, id => id.toUpperCase())).toEqual([
      { value: 1, label: 'default · ANTHROPIC, OPENAI' },
      { value: 2, label: 'empty' },
      { value: 3, label: 'unknown' }
    ])
  })

  it('reads IP entries separated by lines, spaces or commas', () => {
    expect(ipEntries(' 192.0.2.7,\n2001:db8::/32  10.0.0.0/8\n')).toEqual(['192.0.2.7', '2001:db8::/32', '10.0.0.0/8'])
    expect(ipEntries('')).toEqual([])
  })
})
