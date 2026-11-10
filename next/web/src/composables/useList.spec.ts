import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { activeFilterCount, useList } from './useList'

const { list, notifyError } = vi.hoisted(() => ({ list: vi.fn(), notifyError: vi.fn() }))
vi.mock('@sub2api/host', async original => ({ ...(await original<typeof import('@sub2api/host')>()), api: { list } }))
vi.mock('@/utils/errors', () => ({ notifyError }))

describe('activeFilterCount', () => {
  it('counts the set filters except the primary ones', () => {
    expect(activeFilterCount({ q: 'x', status: 'active', role: '', mine: false, group_id: null })).toBe(1)
    expect(activeFilterCount({ q: 'x', model: 'm', status: 'active' }, ['q', 'model'])).toBe(1)
  })
})

describe('useList', () => {
  /** The rows the server holds; a request gets its page of them. */
  let stored: number[] = []
  const pages = () => list.mock.calls.map(([, query]) => query.page)

  beforeEach(() => {
    vi.clearAllMocks()
    stored = Array.from({ length: 45 }, (_, i) => i + 1)
    list.mockImplementation(async (_path: string, q: { page: number; page_size: number }) => ({
      items: stored.slice((q.page - 1) * q.page_size, q.page * q.page_size),
      page: { page: q.page, page_size: q.page_size, total: stored.length },
      paged: true
    }))
  })

  it('loads the page asked for from the console API and toasts a failed load', async () => {
    const rows = useList<number>('/things', { q: '' })
    await flushPromises()
    expect(list).toHaveBeenCalledWith('/things', { page: 1, page_size: 20, q: '' })
    expect(rows.items.value).toHaveLength(20)
    expect(rows.total.value).toBe(45)

    const down = new Error('down')
    list.mockRejectedValueOnce(down)
    await rows.reload()
    expect(notifyError).toHaveBeenCalledWith(down)
  })

  it('moves to the last page when the page it is on was emptied while others have rows', async () => {
    const rows = useList<number>('/things')
    rows.page.value = 3
    await flushPromises()
    expect(rows.items.value).toEqual([41, 42, 43, 44, 45])

    stored = stored.slice(0, 40)
    await rows.reload()
    await flushPromises()
    expect(rows.page.value).toBe(2)
    expect(rows.items.value).toEqual(stored.slice(20))
    expect(pages()).toEqual([1, 3, 3, 2])
  })

  it('skips every page that is gone, not just one', async () => {
    const rows = useList<number>('/things')
    rows.page.value = 3
    await flushPromises()
    stored = stored.slice(0, 7)
    await rows.reload()
    await flushPromises()
    expect(rows.page.value).toBe(1)
    expect(rows.items.value).toHaveLength(7)
  })

  it('stays where it is when nothing is left at all, or the page still has rows', async () => {
    const rows = useList<number>('/things')
    rows.page.value = 3
    await flushPromises()
    stored = stored.slice(0, 41)
    await rows.reload()
    await flushPromises()
    expect(rows.page.value).toBe(3)

    stored = []
    list.mockClear()
    await rows.reload()
    await flushPromises()
    expect(rows.page.value).toBe(3)
    expect(rows.total.value).toBe(0)
    expect(list).toHaveBeenCalledTimes(1)
  })

  it('does not chase a server that answers an empty page it counts rows for', async () => {
    list.mockResolvedValue({ items: [], page: { page: 1, page_size: 20, total: 45 }, paged: true })
    const rows = useList<number>('/things')
    rows.page.value = 2
    await flushPromises()
    expect(rows.page.value).toBe(2)
    expect(pages()).toEqual([1, 2])
  })
})
