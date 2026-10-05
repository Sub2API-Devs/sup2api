import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import UsageTable from './UsageTable.vue'
import UsageStatus from './UsageStatus.vue'
import UsageTokens from './UsageTokens.vue'
import type { UsageRow } from './usage'

enableAutoUnmount(afterEach)
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
  it('keeps model, routing and error readable while preserving request-id filtering', async () => {
    const w = mount(UsageTable, { props: { rows: [row], showClientRequestId: true }, global })
    expect(w.findAll('th').length).toBe(9)
    expect(w.text()).toContain(row.model)
    expect(w.text()).toContain(row.group_name)
    expect(w.text()).toContain('403')
    expect(w.text()).not.toContain('usage.errors.model_not_allowed')
    await w.get('[data-testid="client-request-id"]').trigger('click')
    expect(w.emitted('filter-client-request-id')).toEqual([['client-request-one']])
  })
  it('loads owner-scoped mobile detail only when expanded and keeps admin fields hidden', async () => {
    const w = mount(UsageTable, {
      props: { rows: [row], showUser: false, showAccount: false, detailPath: id => `/me/usage/${id}` },
      global
    })
    expect(w.find('[data-testid="usage-detail"]').exists()).toBe(false)
    expect(w.text()).not.toContain('Account nine')
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
  it('shows stream and HTTP status alongside translated errors', () => {
    const w = mount(UsageStatus, { props: { row: { ...row, stream: true } }, global })
    expect(w.text()).toContain('403')
    expect(w.text()).not.toContain('model_not_allowed')
    expect(w.get('p').attributes('title')).toContain('model not allowed for this group')
  })
})
