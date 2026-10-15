import { afterEach, describe, expect, it, vi } from 'vitest'
import { createItemId } from './itemId'

afterEach(() => vi.unstubAllGlobals())
describe('UI item identities', () => {
  it('works when the secure-context-only randomUUID API is missing', () => {
    const getRandomValues = crypto.getRandomValues.bind(crypto)
    vi.stubGlobal('crypto', { getRandomValues })
    const ids = Array.from({ length: 100 }, createItemId)
    expect(new Set(ids).size).toBe(100)
    expect(ids.every(id => /^[a-f0-9]{32}$/.test(id))).toBe(true)
  })
  it('does not crash when crypto is unavailable', () => {
    vi.stubGlobal('crypto', undefined)
    const ids = Array.from({ length: 100 }, createItemId)
    expect(new Set(ids).size).toBe(100)
  })
})
