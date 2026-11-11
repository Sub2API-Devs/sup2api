import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import type { Account } from '@/api/types'
import { i18n } from '@/i18n'
import AccountLimitsCell from './AccountLimitsCell.vue'
import AccountLimitsTable from './AccountLimitsTable.vue'
import ModelLimitsEditor from './ModelLimitsEditor.vue'
import { entryPositions, fromCards, newCard, repeatedModel, toCards } from './modelLimits'

enableAutoUnmount(afterEach)
const account = (over: Partial<Account> = {}) =>
  ({ id: 1, max_concurrency: 10, rpm_limit: 0, tpm_limit: 1000, spm_limit: 4, in_use: 2, rate_usage: { rpm: 7, tpm: 900, sessions: 3 }, ...over }) as Account
const caps = { max_concurrency: 0, rpm_limit: 0, tpm_limit: 0, spm_limit: 0 }
const cardCaps = { ...caps, spm_window_seconds: 60 }

describe('account limits cell', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'zh'
  })
  it('shows used/cap, only the usage without a cap, in the order concurrency, RPM, TPM, sessions', () => {
    const w = mount(AccountLimitsCell, { props: { account: account() }, global: { plugins: [i18n] } })
    const pills = w.findAll('[data-limit]')
    expect(pills.map((p) => p.attributes('data-limit'))).toEqual(['concurrency', 'rpm', 'tpm', 'sessions'])
    expect(pills.map((p) => p.text())).toEqual(['2/10', '7', '900/1K', '3/4'])
    expect(w.find('[data-testid="account-limit-lists"]').exists()).toBe(false)
  })
  it('colours each figure with its own hue, and with the level near the cap', () => {
    const w = mount(AccountLimitsCell, { props: { account: account({ rpm_limit: 10, tpm_limit: 0, spm_limit: 0, rate_usage: { rpm: 10, tpm: 0, sessions: 0 } }) }, global: { plugins: [i18n] } })
    const pill = (key: string) => w.get(`[data-limit="${key}"]`).classes()
    expect(pill('concurrency')).toEqual(expect.arrayContaining(['bg-violet-50', 'text-violet-700']))
    expect(pill('tpm')).toEqual(expect.arrayContaining(['bg-sky-50', 'opacity-60']))
    // At the cap: the danger text and ring replace the figure's own text colour.
    expect(pill('rpm')).toEqual(expect.arrayContaining(['bg-rose-50', 'text-danger-700', 'ring-danger-500/60']))
    expect(pill('rpm')).not.toContain('text-rose-700')
    expect(pill('sessions')).toEqual(expect.arrayContaining(['bg-emerald-50', 'opacity-60']))
  })
  it('shows only the active sessions without a cap', () => {
    const w = mount(AccountLimitsCell, { props: { account: account({ spm_limit: 0 }) }, global: { plugins: [i18n] } })
    expect(w.get('[data-limit="sessions"]').text()).toBe('3')
  })
  it('adds the period of sessions not counted per minute', async () => {
    const sessions = (a: Account) => mount(AccountLimitsCell, { props: { account: a }, global: { plugins: [i18n] } }).get('[data-limit="sessions"]').text()
    expect(sessions(account({ spm_limit: 20, spm_window_seconds: 300 }))).toBe('3/20·5分')
    expect(sessions(account({ spm_window_seconds: 3600 }))).toBe('3/4·1小时')
    expect(sessions(account({ spm_window_seconds: 60 }))).toBe('3/4')
    i18n.global.locale.value = 'en'
    expect(sessions(account({ spm_limit: 20, spm_window_seconds: 300 }))).toBe('3/20·5m')
    expect(sessions(account({ spm_window_seconds: 7200 }))).toBe('3/4·2h')
  })
  it('breaks the usage down by model list', () => {
    const a = account({
      spm_window_seconds: 300,
      model_limits: [{ models: ['m-a', 'm-b', 'm-c'], max_concurrency: 1, rpm_limit: 5, tpm_limit: 0, spm_limit: 2 }],
      rate_usage: { rpm: 7, tpm: 900, sessions: 3, models: [{ models: ['m-a', 'm-b', 'm-c'], in_use: 1, rpm: 5, tpm: 40, sessions: 2 }] }
    })
    expect(mount(AccountLimitsCell, { props: { account: a }, global: { plugins: [i18n] } }).get('[data-testid="account-limit-lists"]').text()).toBe('1 组模型')
    const t = mount(AccountLimitsTable, { props: { account: a }, global: { plugins: [i18n] } })
    expect(t.findAll('th').map((c) => c.text())).toEqual(['范围', '并发', 'RPM', 'TPM', '会话'])
    expect(t.get('[data-testid="account-limits-total"]').findAll('td').map((c) => c.text())).toEqual(['全部模型', '2/10', '7', '900/1K', '3/4· 5分'])
    const list = t.get('[data-testid="account-limits-list"]')
    expect(list.findAll('td').map((c) => c.text())).toEqual(['m-a, m-b +1', '1/1', '5/5', '40', '2/2· 1分'])
  })
})

describe('model limit cards', () => {
  it('groups consecutive lists with the same limits and saves one entry per non-empty list', () => {
    const saved = [
      { models: ['a'], ...caps, rpm_limit: 5, spm_limit: 2 },
      { models: ['b', 'c'], ...caps, rpm_limit: 5, spm_limit: 2 },
      { models: ['d'], ...caps, rpm_limit: 5 }
    ]
    const cards = toCards(saved)
    expect(cards.map((c) => c.lists)).toEqual([[['a'], ['b', 'c']], [['d']]])
    cards[0].lists.splice(1, 0, [])
    expect(fromCards(cards)).toEqual(saved)
    expect(entryPositions(cards)).toEqual([{ card: 0, list: 0 }, { card: 0, list: 2 }, { card: 1, list: 0 }])
  })
  it('reads entries saved before sessions or their period as unlimited per minute', () => {
    const old = [{ models: ['a'], max_concurrency: 1, rpm_limit: 0, tpm_limit: 0 }] as unknown as Parameters<typeof toCards>[0]
    expect(toCards(old)).toEqual([{ lists: [['a']], ...cardCaps, max_concurrency: 1 }])
    expect(newCard()).toEqual({ lists: [[]], ...cardCaps })
  })
  it('keeps lists with another period apart and saves the period only when it is not 1 minute', () => {
    const saved = [{ models: ['a'], ...caps, spm_limit: 2, spm_window_seconds: 300 }, { models: ['b'], ...caps, spm_limit: 2 }]
    const cards = toCards([...saved, { models: ['c'], ...caps, spm_limit: 2, spm_window_seconds: 60 }])
    expect(cards.map((c) => [c.lists, c.spm_window_seconds])).toEqual([[[['a']], 300], [[['b'], ['c']], 60]])
    expect(fromCards(cards)).toEqual([...saved, { models: ['c'], ...caps, spm_limit: 2 }])
    expect(fromCards([{ lists: [['d']], ...cardCaps, spm_window_seconds: null }])).toEqual([{ models: ['d'], ...caps }])
  })
  it('finds a model listed twice', () => {
    expect(repeatedModel(toCards([{ models: ['a', 'a'], ...caps }]))).toBe('')
    expect(repeatedModel([{ lists: [['a'], ['b', 'a']], ...cardCaps }])).toBe('a')
  })
})

describe('model limits editor', () => {
  it('edits the sessions and their period of a card next to concurrency, RPM and TPM', async () => {
    i18n.global.locale.value = 'zh'
    const cards = [{ lists: [['m-a']], ...cardCaps }]
    const w = mount(ModelLimitsEditor, {
      props: { modelValue: cards, options: [], errors: {} },
      global: { plugins: [i18n], stubs: { ModelTagSelect: true } }
    })
    const ids = w.findAll('input[type="number"]').map((i) => i.attributes('data-testid'))
    expect(ids).toEqual(['model-limit-max_concurrency', 'model-limit-rpm_limit', 'model-limit-tpm_limit', 'model-limit-spm_limit', 'model-limit-spm_limit-window'])
    expect(w.text()).toContain('会话')
    await w.get('input[data-testid="model-limit-spm_limit"]').setValue('3')
    expect(cards[0].spm_limit).toBe(3)
    await w.get('input[data-testid="model-limit-spm_limit-window"]').setValue('5')
    expect(cards[0].spm_window_seconds).toBe(300)
    await w.get('select[data-testid="model-limit-spm_limit-window-unit"]').setValue('1')
    expect(cards[0].spm_window_seconds).toBe(18000)
    // 60 minutes stays in minutes while typing.
    await w.get('select[data-testid="model-limit-spm_limit-window-unit"]').setValue('0')
    await w.get('input[data-testid="model-limit-spm_limit-window"]').setValue('60')
    expect(cards[0].spm_window_seconds).toBe(3600)
    expect((w.get('input[data-testid="model-limit-spm_limit-window"]').element as HTMLInputElement).value).toBe('60')
    await w.get('[data-testid="model-limit-add"]').trigger('click')
    expect(cards[1]).toEqual(newCard())
  })
  it('shows a period set in seconds as seconds and takes whole numbers only', async () => {
    i18n.global.locale.value = 'zh'
    const cards = [{ lists: [['m-a']], ...cardCaps, spm_window_seconds: 90 }]
    const w = mount(ModelLimitsEditor, {
      props: { modelValue: cards, options: [], errors: {} },
      global: { plugins: [i18n], stubs: { ModelTagSelect: true } }
    })
    const input = w.get('input[data-testid="model-limit-spm_limit-window"]')
    const unit = w.get('select[data-testid="model-limit-spm_limit-window-unit"]')
    expect([(input.element as HTMLInputElement).value, input.attributes('min'), input.attributes('step')]).toEqual(['90', '60', undefined])
    expect(unit.findAll('option').map((o) => o.text())).toEqual(['秒', '分钟', '小时'])
    await input.setValue('1.5')
    expect(cards[0].spm_window_seconds).toBeNaN()
    expect((input.element as HTMLInputElement).value).toBe('1.5')
    await unit.setValue('1')
    await input.setValue('2')
    expect(cards[0].spm_window_seconds).toBe(120)
    // Seconds are offered only while the period is in them.
    expect(unit.findAll('option').map((o) => o.text())).toEqual(['分钟', '小时'])
  })
})
