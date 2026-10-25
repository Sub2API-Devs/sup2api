import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import type { ApiKey } from '@/api/types'
import KeyLimitsCell from './KeyLimitsCell.vue'
import { limitsBody, limitsForm } from './keyLimits'

const key = (k: Partial<ApiKey>) => ({ id: 1, name: 'k', group_id: 1, key_prefix: 'sk', status: 'active', created_at: '', ...k }) as ApiKey
const render = (k: Partial<ApiKey>, editable = false) => {
  i18n.global.locale.value = 'zh'
  return mount(KeyLimitsCell, { props: { apiKey: key(k), editable }, global: { plugins: [i18n] } })
}

describe('API key limits cell', () => {
  it('shows only the capped limits with their current use', () => {
    const w = render({ rpm_limit: 60, tpm_limit: 0, max_concurrency: 2, live: { rpm: 51, tpm: 900, concurrency: 1 } })
    expect(w.text()).toContain('RPM51 / 60')
    expect(w.text()).toContain('并发1 / 2')
    expect(w.text()).not.toContain('TPM')
    expect(w.findAll('[role="progressbar"]')).toHaveLength(2)
  })
  it('reads unlimited without caps and only the cap without live counters', () => {
    expect(render({ rpm_limit: 0, tpm_limit: 0, max_concurrency: 0 }).text()).toBe('不限')
    const w = render({ tpm_limit: 200000 })
    expect(w.text()).toBe('TPM200K')
    expect(w.find('[role="progressbar"]').exists()).toBe(false)
  })
  it('offers the editor only when editable', async () => {
    expect(render({}).find('[data-testid="edit-key-limits"]').exists()).toBe(false)
    const w = render({}, true)
    await w.get('[data-testid="edit-key-limits"]').trigger('click')
    expect(w.emitted('edit')).toHaveLength(1)
  })
})

describe('API key limits form', () => {
  it('shows unlimited caps empty and sends empty fields as 0', () => {
    expect(limitsForm({ rpm_limit: 0, tpm_limit: 5, max_concurrency: 0 })).toEqual({ rpm_limit: null, tpm_limit: 5, max_concurrency: null })
    expect(limitsBody({ rpm_limit: null, tpm_limit: 5, max_concurrency: 3 })).toEqual({ rpm_limit: 0, tpm_limit: 5, max_concurrency: 3 })
  })
})
