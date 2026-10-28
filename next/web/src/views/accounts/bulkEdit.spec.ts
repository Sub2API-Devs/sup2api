import { describe, expect, it } from 'vitest'
import type { Account } from '@/api/types'
import { buildBulkPatch, type BulkFields, type BulkFlags } from './bulkEdit'

const account = (over: Partial<Account> = {}) => ({ id: 1, name: 'a', priority: 10, weight: 1, max_concurrency: 10, tpm_limit: 0, rpm_limit: 0, group_ids: [1, 2], proxy_id: null, auto_disable: true, ...over }) as unknown as Account
const fields = (over: Partial<BulkFields> = {}): BulkFields => ({ priority: 10, weight: 1, max_concurrency: 10, tpm_limit: 0, rpm_limit: 0, group_ids: [], groupMode: 'replace', proxy_id: null, auto_disable: true, ...over })
const flags = (over: Partial<BulkFlags> = {}): BulkFlags => ({ priority: false, weight: false, max_concurrency: false, tpm_limit: false, rpm_limit: false, groups: false, proxy: false, auto_disable: false, ...over })

describe('bulk account patch', () => {
  it('sends only ticked fields that differ from the account', () => {
    expect(buildBulkPatch(account(), fields({ priority: 5, weight: 3, rpm_limit: 60 }), flags({ priority: true, rpm_limit: true }))).toEqual({ priority: 5, rpm_limit: 60 })
    expect(buildBulkPatch(account({ priority: 5 }), fields({ priority: 5 }), flags({ priority: true }))).toBeNull()
  })

  it('replaces, adds to or removes from each account its own groups', () => {
    const a = account({ group_ids: [1, 2] })
    expect(buildBulkPatch(a, fields({ group_ids: [3], groupMode: 'replace' }), flags({ groups: true }))).toEqual({ group_ids: [3] })
    expect(buildBulkPatch(a, fields({ group_ids: [2, 3], groupMode: 'add' }), flags({ groups: true }))).toEqual({ group_ids: [1, 2, 3] })
    expect(buildBulkPatch(a, fields({ group_ids: [2, 9], groupMode: 'remove' }), flags({ groups: true }))).toEqual({ group_ids: [1] })
    expect(buildBulkPatch(a, fields({ group_ids: [9], groupMode: 'remove' }), flags({ groups: true }))).toBeNull()
    expect(buildBulkPatch(a, fields({ group_ids: [], groupMode: 'replace' }), flags({ groups: true }))).toEqual({ group_ids: [] })
  })

  it('sets and clears the proxy and the automatic disabling preference', () => {
    expect(buildBulkPatch(account(), fields({ proxy_id: 4 }), flags({ proxy: true }))).toEqual({ proxy_id: 4 })
    expect(buildBulkPatch(account({ proxy_id: 4 }), fields({ proxy_id: null }), flags({ proxy: true }))).toEqual({ proxy_id: null })
    expect(buildBulkPatch(account(), fields({ auto_disable: false }), flags({ auto_disable: true }))).toEqual({ auto_disable: false })
  })
})
