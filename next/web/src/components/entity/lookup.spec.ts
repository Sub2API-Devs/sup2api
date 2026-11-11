import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, nextTick } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { ApiError, session, type Query } from '@sub2api/host'
import { lookupEntities, lookupUnavailable, resetEntityLookups, useEntityNames } from './lookup'

const get = vi.hoisted(() => vi.fn())
vi.mock('@sub2api/host', async (original) => ({ ...(await original<typeof import('@sub2api/host')>()), api: { get } }))

const GROUPS = [{ id: 3, name: 'cc-low', status: 'active' }]
const queries = () => get.mock.calls.map(([path, query]) => [path, Object.fromEntries(Object.entries(query as Query).filter(([, v]) => v !== undefined))])

beforeEach(() => {
  resetEntityLookups()
  get.mockReset().mockImplementation(async (_path: string, query: Query = {}) => {
    const ids = typeof query.ids === 'string' ? query.ids.split(',') : null
    return { items: GROUPS.filter((g) => !ids || ids.includes(String(g.id))), more: false }
  })
})

describe('useEntityNames', () => {
  it('labels an id as "name #id" once the lookup answers, "#id" until then and when it is unknown', async () => {
    const { label, name } = useEntityNames()
    const chip = computed(() => `${label('group', '3')} / ${label('group', 9)}`)
    expect(chip.value).toBe('#3 / #9')
    await flushPromises()
    expect(queries()).toEqual([['/lookup/groups', { ids: '3,9' }]])
    expect(chip.value).toBe('cc-low #3 / #9')
    expect([name('group', '3'), name('group', '9'), name('group', ''), label('group', null)]).toEqual(['cc-low', undefined, undefined, ''])
    await nextTick()
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('does not ask for an id the lookup cannot hold, which the core would refuse with the whole batch', async () => {
    const { label } = useEntityNames()
    const past = '99999999999999999999' // more than an int64 holds
    const chip = computed(() => [label('group', 0), label('group', '007'), label('group', 'abc'), label('group', past), label('group', 3)].join(' / '))
    expect(chip.value).toBe(`#0 / #007 / #abc / #${past} / #3`)
    await flushPromises()
    expect(queries()).toEqual([['/lookup/groups', { ids: '3' }]])
    expect(chip.value).toBe(`#0 / #007 / #abc / #${past} / cc-low #3`)
  })

  it('a model is its name, without a lookup', () => {
    const { label, name } = useEntityNames()
    expect([name('model', 'gpt-4o'), label('model', 'gpt-4o')]).toEqual(['gpt-4o', 'gpt-4o'])
    expect(get).not.toHaveBeenCalled()
  })

  it('keeps the caller\'s own names apart and uses what a search already returned', async () => {
    await lookupEntities('group', { q: 'cc' })
    const all = useEntityNames()
    const own = useEntityNames({ mine: true })
    expect(all.label('group', 3)).toBe('cc-low #3')
    expect(own.label('group', 3)).toBe('#3')
    await flushPromises()
    expect(queries()).toEqual([['/lookup/groups', { q: 'cc' }], ['/lookup/groups', { ids: '3', mine: true }]])
    expect(own.label('group', 3)).toBe('cc-low #3')
  })

  it('asks for at most 100 ids a request', async () => {
    const { name } = useEntityNames()
    for (let id = 1; id <= 101; id++) name('user', id)
    await flushPromises()
    expect(get.mock.calls.map(([, query]) => String((query as Query).ids).split(',').length)).toEqual([100, 1])
  })

  it('asks again after a failure, but not once the core refused the lookup', async () => {
    const { name } = useEntityNames()
    get.mockRejectedValueOnce(new ApiError(502, { code: 'unavailable', message: 'bad gateway' }))
    name('group', 3)
    await flushPromises()
    expect(lookupUnavailable('group')).toBe(false)
    name('group', 3)
    await flushPromises()
    expect(name('group', 3)).toBe('cc-low')

    get.mockRejectedValue(new ApiError(404, { code: 'not_found', message: 'no such route' }))
    name('proxy', 1)
    await flushPromises()
    expect(lookupUnavailable('proxy')).toBe(true)
    expect(lookupUnavailable('proxy', true)).toBe(false)
    name('proxy', 2)
    await flushPromises()
    expect(get).toHaveBeenCalledTimes(3)
  })

  it('forgets everything when the session ends', async () => {
    const { name } = useEntityNames()
    name('group', 3)
    await flushPromises()
    expect(name('group', 3)).toBe('cc-low')
    session.clear()
    expect(name('group', 3)).toBeUndefined()
  })

  it('learns nothing from an answer that arrives after its session ended', async () => {
    let answer!: (result: unknown) => void
    get.mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)))
    const { label } = useEntityNames()
    label('group', 3)
    label('group', 9)
    await nextTick()
    resetEntityLookups()
    answer({ items: GROUPS, more: false })
    await flushPromises()
    // Neither the last user's name nor "unknown" for an id the next user may see.
    expect(label('group', 3)).toBe('#3')
    await flushPromises()
    expect(get).toHaveBeenCalledTimes(2)
    expect([label('group', 3), label('group', 9)]).toEqual(['cc-low #3', '#9'])
  })
})

describe('lookupEntities', () => {
  it('narrows given ids by the scope, for "is this key that user\'s"', async () => {
    get.mockResolvedValue({ items: [], more: false })
    expect(await lookupEntities('api_key', { ids: [5], scope: { user_id: 9 } })).toEqual({ items: [], more: false })
    expect(queries()).toEqual([['/lookup/api-keys', { ids: '5', user_id: 9 }]])
  })
})
