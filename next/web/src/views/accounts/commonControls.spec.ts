import { describe, expect, it } from 'vitest'
import type { Account, AccountType } from '@/api/types'
import { accountControl, controlViews, defaultMappingOf, fixedCount, newAccountValues, savedAccountValues, withoutFixed } from './commonControls'

const type = (common_controls: AccountType['common_controls'], extra: Partial<AccountType> = {}) => ({ plugin_key: 'p', type: 't', common_controls, ...extra }) as AccountType
const t = (key: string) => key.split('.').pop()!

describe('common controls', () => {
  it('resolves a declaration with the core defaults', () => {
    expect(accountControl(undefined, 'priority')).toEqual({ visible: true, configurable: true, locked: false, required: false, default: undefined })
    expect(accountControl(type({ weight: { visible: false, configurable: false, default: 3 } }), 'weight')).toEqual({ visible: false, configurable: false, locked: false, required: false, default: 3 })
    // locked implies read-only; proxy only reads `required`.
    expect(accountControl(type({ rpm_limit: { locked: true, default: 9 } }), 'rpm_limit')).toMatchObject({ configurable: false, locked: true })
    expect(accountControl(type({ proxy: { required: true, configurable: false, visible: false } }), 'proxy')).toEqual({ visible: true, configurable: true, locked: false, required: true, default: undefined })
  })

  it('views every control with the reason it is disabled', () => {
    const v = controlViews(type({ priority: { configurable: false }, weight: { locked: true, default: 2 }, environment: { visible: false }, proxy: { required: true } }), t)
    expect(v.priority).toEqual({ visible: true, disabled: true, required: false, reason: 'commonControlFixed' })
    expect(v.weight).toEqual({ visible: true, disabled: true, required: false, reason: 'commonControlLocked' })
    expect(v.environment).toEqual({ visible: false, disabled: false, required: false, reason: '' })
    expect(v.proxy.required).toBe(true)
    expect(Object.keys(v)).toHaveLength(15)
  })

  it('starts a new account from core, then default_limits, then the declared defaults', () => {
    const at = type({ priority: { default: 7 }, header_passthrough: { default: ['*'] } }, { default_limits: { priority: 3, weight: 4, max_concurrency: undefined } })
    expect(newAccountValues(at, { priority: 10, weight: 1, max_concurrency: 0 })).toEqual({ priority: 7, weight: 4, max_concurrency: 0, header_passthrough: ['*'] })
  })

  it('keeps a saved account\'s values except the locked ones', () => {
    const at = type({ weight: { locked: true, default: 2 }, priority: { configurable: false, default: 1 } })
    const a = { priority: 50, weight: 9, rpm_limit: null } as unknown as Account
    expect(savedAccountValues(a, at, { priority: 10, weight: 1, rpm_limit: 0 })).toEqual({ priority: 50, weight: 2, rpm_limit: 0 })
  })

  it('takes the declared mapping before default_model_mapping', () => {
    expect(defaultMappingOf(type({}, { default_model_mapping: { a: 'b' } }))).toEqual({ a: 'b' })
    expect(defaultMappingOf(type({ model_mapping: { default: { x: 'y' } } }, { default_model_mapping: { a: 'b' } }))).toEqual({ x: 'y' })
    expect(defaultMappingOf(null)).toEqual({})
  })

  it('leaves fixed fields out of a request and counts the accounts that fix one', () => {
    const at = type({ weight: { locked: true, default: 2 }, model_mapping: { configurable: false }, proxy: { required: true }, priority: { visible: false } })
    expect(withoutFixed({ name: 'n', weight: 3, model_mapping: {}, priority: 1, proxy_id: 4 }, at)).toEqual({ name: 'n', priority: 1, proxy_id: 4 })
    const accounts = [{ id: 1 }, { id: 2 }, { id: 3 }] as Account[]
    expect(fixedCount(accounts, a => (a.id === 1 ? undefined : at), 'weight')).toBe(2)
    expect(fixedCount(accounts, () => at, 'priority')).toBe(0)
  })
})
