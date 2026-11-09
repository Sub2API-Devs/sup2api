import { describe, expect, it } from 'vitest'
import type { Account, AccountType } from '@/api/types'
import { accountControl, controlViews, defaultMappingOf, fixedCount, newAccountValues, sameControlValue, savedAccountValues, withoutFixed } from './commonControls'

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

  it('shows a saved account\'s stored values, saying when saving moves a locked one to its value', () => {
    const at = type({ weight: { locked: true, default: 2 }, priority: { configurable: false, default: 1 }, model_mapping: { locked: true, default: { a: 'b', c: 'd' } } })
    const a = { priority: 50, weight: 9, rpm_limit: null, model_mapping: { c: 'd', a: 'b' } } as unknown as Account
    expect(savedAccountValues(a, { priority: 10, weight: 1, rpm_limit: 0 })).toEqual({ priority: 50, weight: 9, rpm_limit: 0 })
    const tv = (key: string, v?: Record<string, unknown>) => (v ? `${key.split('.').pop()} ${v.value}` : key.split('.').pop()!)
    const v = controlViews(at, tv, a)
    expect([v.weight.reason, v.model_mapping.reason, v.priority.reason]).toEqual(['commonControlLockedPending 2', 'commonControlLocked', 'commonControlFixed'])
    expect(controlViews(at, tv, { ...a, weight: 2 }).weight.reason).toBe('commonControlLocked')
  })

  it('fits an own-level caller\'s new account into the own-level caps, except fixed controls', () => {
    const at = type({ priority: { default: 500 }, rpm_limit: { default: 9 }, weight: { configurable: false, default: 300 } }, { default_limits: { max_concurrency: 0 } })
    const core = { priority: 10, weight: 1, max_concurrency: 10 }
    expect(newAccountValues(at, core, true)).toMatchObject({ priority: 100, weight: 300, max_concurrency: 10, rpm_limit: 9 })
    expect(newAccountValues(at, core)).toMatchObject({ priority: 500, max_concurrency: 0 })
    expect(newAccountValues(type({ max_concurrency: { default: 5000 } }), core, true).max_concurrency).toBe(1000)
  })

  it('compares control values as the core does', () => {
    expect(sameControlValue({ a: 1, b: [1] }, { b: [1], a: 1 })).toBe(true)
    expect(sameControlValue(null, [])).toBe(true)
    expect(sameControlValue({}, undefined)).toBe(true)
    expect(sameControlValue([1, 2], [2, 1])).toBe(false)
    expect(sameControlValue(0, null)).toBe(false)
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
