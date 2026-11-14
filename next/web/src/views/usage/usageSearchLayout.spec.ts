import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@sub2api/host'
import { resetEntityLookups } from '@/components/entity/lookup'
import { entityPatch, fieldParams, keyHoldsForUser, queryUsageFilters, usageSearchLayout } from './usageFilters'

const get = vi.hoisted(() => vi.fn())
vi.mock('@sub2api/host', async original => ({ ...(await original<typeof import('@sub2api/host')>()), api: { get } }))

describe('entity search fields', () => {
  it('set an id and, where the entity is searched by name, a text parameter', () => {
    expect(fieldParams('model')).toEqual(['model', 'model_contains'])
    expect(fieldParams('user')).toEqual(['user_id', 'user_email'])
    expect(fieldParams('api_key')).toEqual(['api_key_id', 'api_key_name'])
    expect(fieldParams('account')).toEqual(['account_id', 'account_name'])
    expect(fieldParams('group')).toEqual(['group_id'])
    expect(fieldParams('client_ip')).toEqual(['client_ip'])
  })

  it.each([
    ['user', { id: '7' }, { user_id: '7', user_email: '' }],
    ['user', { id: '', text: 'ann@' }, { user_id: '', user_email: 'ann@' }],
    ['model', { text: 'opus' }, { model: '', model_contains: 'opus' }],
    ['account', {}, { account_id: '', account_name: '' }],
    ['group', { id: '3', text: '' }, { group_id: '3' }]
  ])('%s picked as %o sets %o: the id and the name search exclude each other', (field, picked, patch) => {
    expect(entityPatch(field, picked)).toEqual(patch)
  })

  it('a link presets the exact model or the model search, the exact one alone when it brings both', () => {
    expect(queryUsageFilters({ model: 'gpt-4o', account_name: 'main' }, true)).toEqual({ model: 'gpt-4o' })
    expect(queryUsageFilters({ model_contains: 'gpt' }, false)).toEqual({ model_contains: 'gpt' })
    expect(queryUsageFilters({ model: 'gpt-4o', model_contains: 'opus' }, true)).toEqual({ model: 'gpt-4o' })
  })

  it('a link presets the entities by id: the group for anyone, the user for an operator, the account for one who reads accounts', () => {
    const link = { user_id: '3', group_id: '7', api_key_id: '104', account_id: '25' }
    expect(queryUsageFilters(link, true, true)).toEqual(link)
    expect(queryUsageFilters(link, true)).toEqual({ user_id: '3', group_id: '7', api_key_id: '104' })
    expect(queryUsageFilters(link, false)).toEqual({ group_id: '7', api_key_id: '104' })
  })

  it('a link presets the retried filter for anyone, as true or false only (CONTRACTS §98)', () => {
    expect(queryUsageFilters({ retried: 'true' }, false)).toEqual({ retried: 'true' })
    expect(queryUsageFilters({ retried: 'false' }, true)).toEqual({ retried: 'false' })
    for (const retried of ['1', 'yes', 'TRUE']) expect(queryUsageFilters({ retried }, true)).toEqual({})
  })

  it.each(['abc', '0', '007', '-1', '1.5', ' 7'])('a link id that is not one (%o) is dropped; a model, being a name, is kept', id => {
    expect(queryUsageFilters({ user_id: id, group_id: id, api_key_id: id, account_id: id, model: id }, true, true)).toEqual({ model: id })
  })
})

describe('the API key under a new user', () => {
  beforeEach(() => {
    resetEntityLookups()
    get.mockReset()
  })

  it('has nothing to settle without a user or without a key', async () => {
    expect(await keyHoldsForUser({ user_id: '7' })).toBe(true)
    expect(await keyHoldsForUser({ api_key_id: '104' })).toBe(true)
    expect(await keyHoldsForUser({ user_id: '', user_email: '', api_key_name: 'laptop' })).toBe(true)
    expect(get).not.toHaveBeenCalled()
  })

  it('keeps a picked key the lookup lists among the picked user\'s keys, and drops any other', async () => {
    get.mockResolvedValueOnce({ items: [{ id: 104, name: 'laptop' }], more: false })
    expect(await keyHoldsForUser({ user_id: '7', api_key_id: '104' })).toBe(true)
    expect(get).toHaveBeenLastCalledWith('/lookup/api-keys', expect.objectContaining({ ids: '104', user_id: '7' }))
    get.mockResolvedValueOnce({ items: [], more: false })
    expect(await keyHoldsForUser({ user_id: '12', api_key_id: '104' })).toBe(false)
  })

  it('drops the key where it cannot tell: a searched email, a searched key name, a failed lookup', async () => {
    expect(await keyHoldsForUser({ user_email: 'ann', api_key_id: '104' })).toBe(false)
    expect(await keyHoldsForUser({ user_id: '7', api_key_name: 'laptop' })).toBe(false)
    expect(get).not.toHaveBeenCalled()
    get.mockRejectedValueOnce(new ApiError(403, { code: 'permission_denied', message: 'no' }))
    expect(await keyHoldsForUser({ user_id: '7', api_key_id: '104' })).toBe(false)
  })
})

describe('usageSearchLayout', () => {
  const admin = { admin: true, accounts: true, errors: false }
  const self = { admin: false, accounts: false, errors: false }

  it('puts the model, user and API key on an operator\'s first row and the rest behind More filters', () => {
    const { primary, advanced } = usageSearchLayout(admin)
    expect(primary).toEqual(['model', 'user', 'api_key'])
    expect(advanced).toEqual(['group', 'request_id', 'account', 'client_ip', 'protocol', 'conversion', 'success', 'retried', 'billing_status'])
    expect(usageSearchLayout({ ...admin, accounts: false }).advanced.slice(0, 3)).toEqual(['group', 'request_id', 'client_ip'])
  })

  it('gives a user the group in place of the user, and no operator fields', () => {
    const { primary, advanced, params } = usageSearchLayout(self)
    expect(primary).toEqual(['model', 'group', 'api_key'])
    expect(advanced).toEqual(['request_id', 'client_ip', 'protocol', 'success', 'retried', 'billing_status'])
    for (const key of ['user_id', 'user_email', 'account_id', 'node_id', 'conversion']) expect(params).not.toContain(key)
    // the group is picked on the first row; a group name a link brought is still managed, as a chip
    expect(usageSearchLayout(self).tagged).not.toContain('group_id')
    expect(usageSearchLayout(self).tagged).toContain('group_name')
  })

  it('swaps the status for the HTTP status and error type under failed requests, and does not tag the status set there', () => {
    const { advanced, tagged } = usageSearchLayout({ ...self, errors: true })
    expect(advanced).not.toContain('success')
    expect(advanced).toContain('retried')
    expect(advanced.slice(-2)).toEqual(['status_code', 'error_type'])
    expect(tagged).not.toContain('success')
    expect(usageSearchLayout(self).tagged).toContain('success')
  })

  it('keeps the parameters without a field, tagging all but the first row\'s', () => {
    const { params, tagged } = usageSearchLayout(admin)
    for (const key of ['group_id', 'group_name', 'account_id', 'account_name', 'retried', 'client_request_id', 'platform', 'endpoint', 'plugin_key', 'account_type', 'node_id', 'upstream_model', 'upstream_protocol', 'stream', 'status_code']) {
      expect(params).toContain(key)
      expect(tagged).toContain(key)
    }
    for (const key of ['model', 'model_contains', 'user_id', 'user_email', 'api_key_id', 'api_key_name']) {
      expect(params).toContain(key)
      expect(tagged).not.toContain(key)
    }
    expect(new Set(params).size).toBe(params.length)
  })
})
