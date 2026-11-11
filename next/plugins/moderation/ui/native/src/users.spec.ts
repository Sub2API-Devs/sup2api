import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, type PluginHost } from '@sub2api/host'
import { setHost } from './host'
import { resetSessionCaches } from './session'
import { resolveUserIds, useUserFilter } from './users'

// The core's user search (GET /users?q=) answers from `search`.
const search = vi.fn<(path: string, query: { q: string }) => Promise<{ items: Array<{ id: number }> }>>()

beforeEach(() => {
  search.mockReset()
  setHost({ api: { list: search }, t: (key: string) => key } as unknown as PluginHost)
})
afterEach(() => {
  resetSessionCaches()
  setHost(null)
})

describe('user filter of a list', () => {
  it('takes a picked user as user_id without a search', async () => {
    const f = useUserFilter()
    expect(await f.resolve('7', '')).toBe(true)
    expect(f.query.value).toEqual({ user_id: 7 })
    expect(search).not.toHaveBeenCalled()
  })

  it('searches a name through the core, digits included, and filters by the users found', async () => {
    search.mockResolvedValue({ items: [{ id: 7 }, { id: 12 }] })
    const f = useUserFilter()
    await f.resolve('', ' 007 ')
    expect(search).toHaveBeenCalledWith('/users', { q: '007', page_size: 50 })
    expect(f.query.value).toEqual({ user_ids: '7,12' })
  })

  it('matches nothing when no user has the name, and everything when the picker is empty', async () => {
    search.mockResolvedValue({ items: [] })
    const f = useUserFilter([7])
    expect(f.query.value).toEqual({ user_id: 7 })
    await f.resolve('', 'nobody')
    expect(f.query.value).toEqual({ user_id: Number.MAX_SAFE_INTEGER })
    await f.resolve('', '')
    expect(f.query.value).toEqual({})
  })

  it('says so when a name cannot be searched (no user:read), and still takes an id', async () => {
    search.mockRejectedValue(new ApiError(403, { code: 'forbidden', message: 'forbidden' }))
    const f = useUserFilter()
    await f.resolve('', 'zhang')
    expect(f.error.value).toBe('events.userSearchDenied')
    expect(f.query.value).toEqual({})
    await f.resolve('7', '')
    expect(f.error.value).toBe('')
    expect(f.query.value).toEqual({ user_id: 7 })
  })

  it('lets the latest of two searches decide', async () => {
    let answerFirst: (r: { items: Array<{ id: number }> }) => void = () => undefined
    search.mockReturnValueOnce(new Promise((resolve) => (answerFirst = resolve)))
    const f = useUserFilter()
    const first = f.resolve('', 'zhang')
    expect(await f.resolve('12', '')).toBe(true)
    answerFirst({ items: [{ id: 7 }] })
    expect(await first).toBe(false)
    expect(f.query.value).toEqual({ user_id: 12 })
  })
})

describe("a form's user box", () => {
  it('reads digits as the id and other text as a name', async () => {
    search.mockResolvedValue({ items: [{ id: 12 }] })
    expect(await resolveUserIds(' 7 ')).toEqual([7])
    expect(search).not.toHaveBeenCalled()
    expect(await resolveUserIds('li')).toEqual([12])
  })
})
