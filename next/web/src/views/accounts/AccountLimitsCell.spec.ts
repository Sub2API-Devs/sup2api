import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import type { Account } from '@/api/types'
import { i18n } from '@/i18n'
import AccountLimitsCell from './AccountLimitsCell.vue'
import AccountLimitsTable from './AccountLimitsTable.vue'
import { entryPositions, fromCards, repeatedModel, toCards } from './modelLimits'

enableAutoUnmount(afterEach)
const account = (over: Partial<Account> = {}) =>
  ({ id: 1, max_concurrency: 10, rpm_limit: 0, tpm_limit: 1000, in_use: 2, rate_usage: { rpm: 7, tpm: 900 }, ...over }) as Account

describe('account limits cell', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'zh'
  })
  it('shows used/cap, only the usage without a cap, in the order concurrency, RPM, TPM', () => {
    const w = mount(AccountLimitsCell, { props: { account: account() }, global: { plugins: [i18n] } })
    const pills = w.findAll('[data-limit]')
    expect(pills.map((p) => p.attributes('data-limit'))).toEqual(['concurrency', 'rpm', 'tpm'])
    expect(pills.map((p) => p.text())).toEqual(['2/10', '7', '900/1K'])
    expect(w.find('[data-testid="account-limit-lists"]').exists()).toBe(false)
  })
  it('breaks the usage down by model list', () => {
    const a = account({
      model_limits: [{ models: ['m-a', 'm-b', 'm-c'], max_concurrency: 1, rpm_limit: 5, tpm_limit: 0 }],
      rate_usage: { rpm: 7, tpm: 900, models: [{ models: ['m-a', 'm-b', 'm-c'], in_use: 1, rpm: 5, tpm: 40 }] }
    })
    expect(mount(AccountLimitsCell, { props: { account: a }, global: { plugins: [i18n] } }).get('[data-testid="account-limit-lists"]').text()).toBe('1 组模型')
    const t = mount(AccountLimitsTable, { props: { account: a }, global: { plugins: [i18n] } })
    expect(t.get('[data-testid="account-limits-total"]').text()).toContain('全部模型')
    const list = t.get('[data-testid="account-limits-list"]')
    expect(list.findAll('td').map((c) => c.text())).toEqual(['m-a, m-b +1', '1/1', '5/5', '40'])
  })
})

describe('model limit cards', () => {
  it('groups consecutive lists with the same limits and saves one entry per non-empty list', () => {
    const saved = [
      { models: ['a'], max_concurrency: 0, rpm_limit: 5, tpm_limit: 0 },
      { models: ['b', 'c'], max_concurrency: 0, rpm_limit: 5, tpm_limit: 0 },
      { models: ['d'], max_concurrency: 2, rpm_limit: 0, tpm_limit: 0 }
    ]
    const cards = toCards(saved)
    expect(cards.map((c) => c.lists)).toEqual([[['a'], ['b', 'c']], [['d']]])
    cards[0].lists.splice(1, 0, [])
    expect(fromCards(cards)).toEqual(saved)
    expect(entryPositions(cards)).toEqual([{ card: 0, list: 0 }, { card: 0, list: 2 }, { card: 1, list: 0 }])
  })
  it('finds a model listed twice', () => {
    expect(repeatedModel(toCards([{ models: ['a', 'a'], max_concurrency: 0, rpm_limit: 0, tpm_limit: 0 }]))).toBe('')
    expect(repeatedModel([{ lists: [['a'], ['b', 'a']], max_concurrency: 0, rpm_limit: 0, tpm_limit: 0 }])).toBe('a')
  })
})
