import { beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.fn()
const list = vi.fn()
vi.mock('@sub2api/host', async (original) => ({ ...(await original<object>()), api: { get, list } }))
const denied = new Set<string>()
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ has: (key: string) => !denied.has(key) }) }))

// lookups.ts caches module-wide: every test gets a fresh copy (and the
// ApiError class of that copy, which isApiError checks against).
async function fresh() {
  vi.resetModules()
  const { ApiError } = await import('@sub2api/host')
  return { ...(await import('./lookups')), ApiError }
}

describe('environment variables lookup', () => {
  // Braces: a function returned from beforeEach runs as its teardown.
  beforeEach(() => {
    get.mockReset()
  })

  const variables = [{ key: 'relay_timeout_seconds', layers: ['global', 'group', 'account'] }, { key: 'global_only', layers: ['global'] }]

  it('shows a layer only when it has variables', async () => {
    get.mockResolvedValue({ variables, process: {} })
    const { useEnvironmentLayer, useEnvironmentVariables } = await fresh()
    const account = useEnvironmentLayer('account')
    expect(account.value).toBe(false) // still loading
    await useEnvironmentVariables().ready
    expect(account.value).toBe(true)
    get.mockResolvedValue({ variables: [variables[1]], process: {} })
    const again = await fresh()
    await again.useEnvironmentVariables().ready
    expect(again.useEnvironmentLayer('account').value).toBe(false)
    expect(again.useEnvironmentLayer('global').value).toBe(true)
  })

  it('remembers a 403 and hides every layer without asking again', async () => {
    const { useEnvironmentLayer, useEnvironmentVariables, ApiError } = await fresh()
    get.mockImplementation(() => Promise.reject(new ApiError(403, { code: 'permission_denied', message: 'permission denied' })))
    const env = useEnvironmentVariables()
    await env.ready
    expect(env.denied.value).toBe(true)
    expect(useEnvironmentLayer('account').value).toBe(false)
    useEnvironmentVariables()
    expect(get).toHaveBeenCalledOnce()
  })

  it('retries after any other failure', async () => {
    const { useEnvironmentLayer, useEnvironmentVariables, ApiError } = await fresh()
    get.mockRejectedValueOnce(new ApiError(503, { code: 'unavailable', message: 'down' })).mockResolvedValue({ variables, process: {} })
    await useEnvironmentVariables().ready
    expect(useEnvironmentVariables().denied.value).toBe(false)
    await useEnvironmentVariables().ready
    expect(get).toHaveBeenCalledTimes(2)
    expect(useEnvironmentLayer('account').value).toBe(true)
  })
})

describe('refreshing the groups or the proxies', () => {
  beforeEach(() => {
    get.mockReset()
    list.mockReset()
  })

  it('drops the names the entity pickers know of that kind, and of no other', async () => {
    list.mockResolvedValue({ items: [] })
    get.mockResolvedValue({ items: [{ id: 3, name: 'before' }], more: false })
    const { useGroupsLookup, useProxiesLookup } = await fresh()
    const { lookupEntities, useEntityNames } = await import('@/components/entity/lookup')
    await Promise.all([lookupEntities('group'), lookupEntities('proxy')])
    const names = useEntityNames()
    expect([names.name('group', 3), names.name('proxy', 3)]).toEqual(['before', 'before'])
    useGroupsLookup(true)
    expect([names.name('group', 3), names.name('proxy', 3)]).toEqual([undefined, 'before'])
    useProxiesLookup(true)
    expect(names.name('proxy', 3)).toBeUndefined()
    // The cached read keeps them.
    await lookupEntities('group')
    useGroupsLookup()
    expect(names.name('group', 3)).toBe('before')
  })
})

describe('groups with the picked ones past the first page', () => {
  beforeEach(() => {
    get.mockReset()
    list.mockReset()
  })

  const group = (id: number, policy?: string) => ({ id, name: `g${id}`, conversion_loss_policy: policy })
  const firstPage = (n: number) => ({ items: Array.from({ length: n }, (_, i) => group(i + 1)) })
  const settled = () => new Promise((resolve) => setTimeout(resolve))
  const asked = () => get.mock.calls.map((c) => c[0])

  it('asks for nothing more while the first page is the whole set', async () => {
    list.mockResolvedValue(firstPage(3))
    const { useGroupsWith } = await fresh()
    const groups = useGroupsWith(() => [2, 900])
    await settled()
    expect(groups.value.map((g) => g.id)).toEqual([1, 2, 3])
    expect(get).not.toHaveBeenCalled()
  })

  it('reads each picked group a full first page lacks, once, until the groups are refreshed', async () => {
    list.mockResolvedValue(firstPage(200))
    get.mockImplementation(async (path: string) => {
      if (path !== '/groups/900') throw new Error('not found')
      return group(900, 'strict')
    })
    const { useGroupsWith, useGroupsLookup } = await fresh()
    // The copy of vue that the fresh lookups.ts watches with.
    const { ref } = await import('vue')
    const ids = ref([2, 900, 901])
    const groups = useGroupsWith(() => ids.value)
    await settled()
    expect(asked()).toEqual(['/groups/900', '/groups/901'])
    // The one the core does not show is left out.
    expect(groups.value).toHaveLength(201)
    expect(groups.value.at(-1)).toEqual(group(900, 'strict'))

    ids.value = [900, 901, 5]
    await settled()
    expect(get).toHaveBeenCalledTimes(2)

    // A group was changed: what was read of it is dropped with the list.
    useGroupsLookup(true)
    expect(groups.value.some((g) => g.id === 900)).toBe(false)
    ids.value = [900]
    await settled()
    expect(asked()).toEqual(['/groups/900', '/groups/901', '/groups/900'])
  })
})

describe('groups without group:read', () => {
  beforeEach(() => {
    get.mockReset()
    list.mockReset()
    denied.add('group:read')
    return () => denied.clear()
  })

  it('asks for nothing (an own-level account editor would get a 403) and keeps the list empty', async () => {
    const { useGroupsLookup, useGroupsWith } = await fresh()
    const { groups, ready } = useGroupsLookup()
    await ready
    const picked = useGroupsWith(() => [2])
    await new Promise((resolve) => setTimeout(resolve))
    expect(groups.value).toEqual([])
    expect(picked.value).toEqual([])
    expect(list).not.toHaveBeenCalled()
    expect(get).not.toHaveBeenCalled()
  })
})
