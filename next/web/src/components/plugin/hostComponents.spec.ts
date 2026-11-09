import { describe, expect, it } from 'vitest'
import { HOST_COMPONENT_NAMES } from '@sub2api/host'
import { hostComponents } from './hostComponents'

describe('host components', () => {
  it('exposes every core editor of UI 3.7 as a read-only object', async () => {
    expect(Object.keys(hostComponents)).toEqual([...HOST_COMPONENT_NAMES])
    expect(Object.isFrozen(hostComponents)).toBe(true)
    for (const c of Object.values(hostComponents)) {
      // Async ones load their component on first use.
      const loader = (c as { __asyncLoader?: () => Promise<unknown> }).__asyncLoader
      expect(loader ? await loader() : c).toBeTruthy()
    }
  })
})
