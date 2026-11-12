import { beforeEach, describe, expect, it, vi } from 'vitest'

const firstPage = vi.hoisted(() => vi.fn())
vi.mock('@/composables/lookups', () => ({ fetchFirstPage: firstPage }))

const named = [{ id: 1, kind: 'named', name: '默认' }]

describe('the lookup of the named user groups', () => {
  beforeEach(() => {
    vi.resetModules()
    firstPage.mockReset()
  })

  it('asks once for the selects and for a page that reads them all', async () => {
    firstPage.mockResolvedValue(named)
    const { useSegmentsLookup, fetchNamedSegments } = await import('./segmentLookup')
    const { segments, ready } = useSegmentsLookup()
    expect(await fetchNamedSegments()).toEqual(named)
    await ready
    expect(segments.value).toEqual(named)
    expect(firstPage).toHaveBeenCalledTimes(1)
    expect(firstPage).toHaveBeenCalledWith('/segments')
  })

  it('rejects a failed request where it must be said, and asks again next time', async () => {
    firstPage.mockRejectedValueOnce(new Error('down')).mockResolvedValue(named)
    const { useSegmentsLookup, fetchNamedSegments } = await import('./segmentLookup')
    await expect(fetchNamedSegments()).rejects.toThrow('down')
    await expect(useSegmentsLookup().ready).resolves.toBeUndefined()
    expect(await fetchNamedSegments()).toEqual(named)
    expect(firstPage).toHaveBeenCalledTimes(2)
  })
})
