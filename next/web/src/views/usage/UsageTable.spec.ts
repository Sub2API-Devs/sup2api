import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { resetViewport } from '../../../packages/ui/src/viewport'
import { i18n } from '@/i18n'
import UsageTable from './UsageTable.vue'
import UsageStatus from './UsageStatus.vue'
import UsageError from './UsageError.vue'
import UsageTokens from './UsageTokens.vue'
import { errorText, type UsageRow } from './usage'

enableAutoUnmount(afterEach)
afterEach(() => {
  vi.unstubAllGlobals()
  resetViewport()
})
/** A phone: narrow, so STable shows the #card form. */
function phone() {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} }))
  resetViewport()
}
const row = {
  id: 1,
  created_at: '2026-10-05T15:00:00Z',
  model: 'claude-opus-5-5',
  group_id: 7,
  group_name: 'Long group name',
  user_id: 3,
  account_id: 9,
  account_name: 'Account nine',
  protocol: 'anthropic.messages',
  client_request_id: 'client-request-one',
  api_key_name: 'my-laptop',
  client_ip: '2001:db8::7',
  success: false,
  status_code: 403,
  error_type: 'model_not_allowed',
  error_message: 'model not allowed for this group',
  input_tokens: 0,
  output_tokens: 0,
  cache_read_tokens: 0,
  cache_creation_tokens: 0,
  total_cost: '0',
  billing_status: 'free',
  latency_ms: 0,
  stream: false
} as UsageRow
const global = {
  plugins: [i18n],
  stubs: { UsageDetail: { props: ['row', 'path'], template: '<div data-testid="usage-detail">{{ path }}</div>' } }
}

describe('usage records layout', () => {
  it('uses the SDK picker for desktop and mobile fields and persists separately for self-service', async () => {
    localStorage.clear()
    const w = mount(UsageTable, { props: { rows: [row], columnSettingsKey: 'core.usage.all' }, global, attachTo: document.body })
    await w.get('[data-testid="table-column-settings"]').trigger('click')
    const ip = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="menuitemcheckbox"]'))
      .find(button => button.textContent?.trim() === i18n.global.t('usage.request.clientIP'))!
    ip.click()
    await nextTick()
    expect(w.find('[data-testid="ip-address-filter"]').exists()).toBe(false)
    w.unmount()
    const restored = mount(UsageTable, { props: { rows: [row], columnSettingsKey: 'core.usage.all' }, global })
    expect(restored.find('[data-testid="ip-address-filter"]').exists()).toBe(false)
    phone()
    const card = mount(UsageTable, { props: { rows: [row], columnSettingsKey: 'core.usage.all' }, global })
    expect(card.get('[data-testid="mobile-usage-record"]').text()).not.toContain(row.client_ip)
    vi.unstubAllGlobals()
    resetViewport()
    const mine = mount(UsageTable, { props: { rows: [row], showUser: false, showAccount: false, columnSettingsKey: 'core.usage.self' }, global })
    expect(mine.get('[data-testid="ip-address-filter"]').text()).toBe(row.client_ip)
  })
  it('keeps model, routing and error readable while preserving request-id filtering', async () => {
    const w = mount(UsageTable, { props: { rows: [row], showClientRequestId: true }, global })
    expect(w.findAll('th').length).toBe(11)
    expect(w.text()).toContain(row.model)
    expect(w.text()).toContain(row.group_name)
    expect(w.get('[data-testid="usage-client"]').text()).toContain('my-laptop')
    expect(w.get('[data-testid="ip-address-filter"]').text()).toBe('2001:db8::7')
    expect(w.find('[data-testid="mobile-usage-record"]').exists()).toBe(false)
    await w.get('[data-testid="ip-address-filter"]').trigger('click')
    expect(w.emitted('filter-client-ip')).toEqual([['2001:db8::7']])
    expect(w.text()).toContain('403')
    expect(w.text()).not.toContain('usage.errors.model_not_allowed')
    expect(w.get('[data-testid="usage-error-summary"]').element.closest('td')?.querySelector('time')).not.toBeNull()
    const headers = w.findAll('th').map(th => th.text())
    expect(headers.indexOf(i18n.global.t('usage.request.clientIP'))).toBeLessThan(headers.indexOf(i18n.global.t('common.model')))
    expect(headers.indexOf(i18n.global.t('common.account'))).toBe(headers.indexOf(i18n.global.t('common.model')) + 1)
    await w.get('[data-testid="client-request-id"]').trigger('click')
    expect(w.emitted('filter-client-request-id')).toEqual([['client-request-one']])
  })
  it('shows the upstream account as "#id name" and filters by it on click', async () => {
    const w = mount(UsageTable, { props: { rows: [row, { ...row, id: 2, account_id: null, account_name: '' }] }, global })
    const accounts = w.findAll('[data-testid="usage-account"]')
    expect(accounts.length).toBe(1)
    expect(accounts[0].findAll('span').map(x => x.text()).filter(Boolean)).toEqual(['#9', 'Account nine'])
    expect(accounts[0].attributes('title')).toContain('#9 Account nine')
    await accounts[0].trigger('click')
    expect(w.emitted('filter-account-id')).toEqual([[9]])
  })
  it('loads owner-scoped mobile detail only when expanded and keeps admin fields hidden', async () => {
    phone()
    const w = mount(UsageTable, {
      props: { rows: [row], showUser: false, showAccount: false, detailPath: id => `/me/usage/${id}` },
      global
    })
    expect(w.find('[data-testid="usage-detail"]').exists()).toBe(false)
    expect(w.text()).not.toContain('Account nine')
    expect(w.text()).not.toContain('#9')
    expect(w.findAll('[data-testid="usage-account"]')).toHaveLength(0)
    const expand = w.get('[data-testid="mobile-usage-record"] button[aria-expanded]')
    await expand.trigger('click')
    expect(expand.attributes('aria-expanded')).toBe('true')
    expect(w.get('[data-testid="usage-detail"]').text()).toBe('/me/usage/1')
    await expand.trigger('click')
    expect(w.find('[data-testid="usage-detail"]').exists()).toBe(false)
  })
  it('preserves cache-only usage on failed requests', () => {
    const w = mount(UsageTokens, { props: { row: { ...row, cache_read_tokens: 1234 } }, global })
    expect(w.text()).toContain('1,234')
    expect(w.attributes('title')).toContain('1,234')
  })
  it('shows the HTTP status and a translated error with the raw message on hover', () => {
    expect(mount(UsageStatus, { props: { row }, global }).text()).toContain('403')
    const w = mount(UsageError, { props: { row }, global })
    expect(w.text()).not.toContain('model_not_allowed')
    expect(w.get('p').attributes('title')).toContain('model not allowed for this group')
  })
  it('shows a failed request as "status_code=…, message" in the detail column, whole text on hover', async () => {
    const w = mount(UsageTable, { props: { rows: [row, { ...row, id: 2, success: true, status_code: 200, matched_tier: 'tier-a' }] }, global, attachTo: document.body })
    const texts = w.findAll('[data-testid="usage-error-text"]')
    expect(texts.map(x => x.text())).toEqual(['status_code=403, model not allowed for this group'])
    expect(texts[0].element.closest('td')).not.toBeNull()
    expect(w.text()).toContain('tier-a')
    await texts[0].trigger('focusin')
    expect(document.querySelector('[role="tooltip"]')?.textContent).toContain('status_code=403, model not allowed for this group')
  })
  it('shows each request as a card on a phone, with the same fields and filters', async () => {
    phone()
    const w = mount(UsageTable, { props: { rows: [row], showClientRequestId: true }, global })
    expect(w.find('table').exists()).toBe(false)
    const card = w.get('[data-testid="mobile-usage-record"]')
    expect(card.text()).toContain(row.model)
    expect(card.text()).toContain('#9 Account nine')
    expect(card.text()).toContain('status_code=403, model not allowed for this group')
    await card.get('[data-testid="ip-address-filter"]').trigger('click')
    expect(w.emitted('filter-client-ip')).toEqual([['2001:db8::7']])
    await card.findAll('button').find(b => b.text() === 'client-request-one')!.trigger('click')
    expect(w.emitted('filter-client-request-id')).toEqual([['client-request-one']])
    await card.findAll('button').find(b => b.text() === '#9 Account nine')!.trigger('click')
    expect(w.emitted('filter-account-id')).toEqual([[9]])
  })
  it('falls back to the error type when there is no message', () => {
    expect(errorText({ ...row, status_code: 503, error_type: 'model_availability', error_message: '' })).toBe('status_code=503, model_availability')
    expect(errorText({ ...row, status_code: 0, error_type: '', error_message: 'boom' })).toBe('boom')
    expect(errorText({ ...row, success: true })).toBe('')
  })
})
