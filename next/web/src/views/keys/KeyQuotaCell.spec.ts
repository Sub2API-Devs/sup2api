import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import type { ApiKey } from '@/api/types'
import KeyQuotaCell from './KeyQuotaCell.vue'

const render = (k: Partial<ApiKey>) => {
  i18n.global.locale.value = 'zh'
  return mount(KeyQuotaCell, { props: { apiKey: { id: 1, name: 'k', group_id: 1, key_prefix: 'sk', status: 'active', created_at: '', ...k } as ApiKey }, global: { plugins: [i18n] } })
}

describe('API key quota cell', () => {
  it('shows used / limit with a bar, red once used up', () => {
    const w = render({ quota_limit: '20', quota_used: '17.3' })
    expect(w.text().replace(/\s+/g, '')).toBe('$17.30/$20.00')
    expect(w.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('17.3')
    expect(render({ quota_limit: '5', quota_used: '5' }).find('.text-red-600').exists()).toBe(true)
  })
  it('reads unlimited with what the key used', () => {
    const w = render({ quota_limit: '0', quota_used: '3.2' })
    expect(w.text()).toBe('不限 · 已用 $3.20')
    expect(w.find('[role="progressbar"]').exists()).toBe(false)
  })
})
