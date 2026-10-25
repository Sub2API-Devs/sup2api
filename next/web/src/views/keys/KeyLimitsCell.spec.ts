import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import type { ApiKey } from '@/api/types'
import KeyLimitsCell from './KeyLimitsCell.vue'
import { capsBody, capsForm } from './keyLimits'

const render = (k: Partial<ApiKey>) => {
  i18n.global.locale.value = 'zh'
  return mount(KeyLimitsCell, { props: { apiKey: { id: 1, name: 'k', group_id: 1, key_prefix: 'sk', status: 'active', created_at: '', ...k } as ApiKey }, global: { plugins: [i18n] } })
}
const line = (w: ReturnType<typeof render>, field: string) => w.get(`[data-limit="${field}"]`).text().replace(/\s+/g, '')

describe('API key limits cell', () => {
  it('shows RPM, TPM and concurrency as use / cap, ∞ when unlimited, bars under the capped', () => {
    const w = render({ rpm_limit: 60, tpm_limit: 0, max_concurrency: 2, live: { rpm: 51, tpm: 900, concurrency: 1 } })
    expect(line(w, 'rpm_limit')).toBe('RPM51/60')
    expect(line(w, 'tpm_limit')).toBe('TPM900/∞')
    expect(line(w, 'max_concurrency')).toBe('并发1/2')
    expect(w.findAll('[role="progressbar"]')).toHaveLength(2)
  })
  it('shows — for uses that are not counted', () => {
    const w = render({ tpm_limit: 200000 })
    expect(line(w, 'tpm_limit')).toBe('TPM—/200K')
    expect(w.find('[role="progressbar"]').exists()).toBe(false)
  })
})

describe('API key limits form', () => {
  it('shows unlimited caps empty and sends empty fields as 0', () => {
    expect(capsForm({ rpm_limit: 0, tpm_limit: 5, max_concurrency: 0, quota_limit: '12.5' })).toEqual({ rpm_limit: null, tpm_limit: 5, max_concurrency: null, quota_limit: 12.5 })
    expect(capsForm({ quota_limit: '0' }).quota_limit).toBeNull()
    expect(capsBody({ rpm_limit: null, tpm_limit: 5, max_concurrency: 3, quota_limit: null })).toEqual({ rpm_limit: 0, tpm_limit: 5, max_concurrency: 3, quota_limit: 0 })
  })
})
