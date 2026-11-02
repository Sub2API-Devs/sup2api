import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import { useOptionalT } from '@/composables/optionalText'
import UsageAvailabilityTrace from './UsageAvailabilityTrace.vue'
import { availabilityReasonLabel, availabilityTrace, type UsageRow } from './usage'

enableAutoUnmount(afterEach)

const createdAt = '2026-11-02T08:00:00Z'
const at = (min: number) => Date.parse(createdAt) / 1000 + min * 60

function rowWith(availability: unknown): UsageRow {
  return {
    id: 1, request_id: 'fixture', model: 'fixture-model', success: false, status_code: 429, error_type: 'model_availability',
    created_at: createdAt, anomalies: availability === undefined ? {} : { availability: typeof availability === 'string' ? availability : JSON.stringify(availability) }
  } as unknown as UsageRow
}

function render(availability: unknown, locale: 'zh' | 'en' = 'zh') {
  i18n.global.locale.value = locale
  return mount(UsageAvailabilityTrace, { props: { row: rowWith(availability) }, global: { plugins: [i18n] } })
}

const blocked = {
  v: 1, outcome: 'blocked_all', candidates: 2, admitted: 0, retry_at: at(134),
  counts: { 'unavailable:quota_rejected:7d_fable': 2 },
  samples: [
    { account_id: 25, account_name: 'cc-main', model: 'claude-fable-4', decision: 'block', reason: 'unavailable:quota_rejected:7d_fable', retry_at: at(134) },
    { account_id: 26, model: 'claude-fable-4', decision: 'block', reason: 'unavailable:quota_rejected:7d_fable' }
  ],
  omitted: 3
}

const open = (w: ReturnType<typeof render>) => w.get('button[aria-expanded]').attributes('aria-expanded')

describe('UsageAvailabilityTrace', () => {
  it('opens a complete block with a danger badge, counts, samples and the earliest retry', () => {
    const w = render(blocked)
    expect(open(w)).toBe('true')
    const badge = w.get('[data-testid="availability-outcome"]')
    expect(badge.text()).toBe('全部拦截')
    expect(badge.classes()).toContain('badge-danger')
    expect(w.get('[data-testid="availability-counts"]').text()).toContain('不可用：额度窗口 7d_fable 已耗尽 × 2')
    const samples = w.findAll('[data-testid="availability-sample"]')
    expect(samples).toHaveLength(2)
    expect(samples[0]!.text()).toContain('#25 cc-main')
    expect(samples[0]!.text()).toContain('claude-fable-4')
    expect(samples[0]!.text()).toContain('拦截')
    expect(samples[1]!.text()).toContain('#26')
    expect(w.get('[data-testid="availability-retry"]').text()).toContain('请求后 2h 14m')
    expect(w.text()).toContain('另有 3 个账号未列出')
  })

  it('keeps a partial block closed with a warning badge', async () => {
    const w = render({ ...blocked, outcome: 'partial', admitted: 1 })
    expect(open(w)).toBe('false')
    expect(w.get('[data-testid="availability-outcome"]').classes()).toContain('badge-warning')
    expect(w.find('[data-testid="availability-sample"]').exists()).toBe(false)
    await w.get('button[aria-expanded]').trigger('click')
    expect(w.findAll('[data-testid="availability-sample"]')).toHaveLength(2)
  })

  it('opens a fail-open trace with an info badge and names the plugin of a whole-batch sample', () => {
    const w = render({ v: 1, outcome: 'fail_open', candidates: 4, admitted: 4, counts: { plugin_timeout: 4 },
      samples: [{ plugin: 'ccgateway', decision: 'fail_open', reason: 'plugin_timeout' }] }, 'en')
    expect(open(w)).toBe('true')
    const badge = w.get('[data-testid="availability-outcome"]')
    expect(badge.text()).toBe('Check failed, let through')
    expect(badge.classes()).toContain('badge-info')
    const sample = w.get('[data-testid="availability-sample"]')
    expect(sample.text()).toContain('Whole batch of plugin ccgateway')
    expect(sample.text()).toContain('Plugin call timed out')
    expect(w.find('[data-testid="availability-hidden-account"]').exists()).toBe(false)
  })

  it('shows a hidden-account hint for samples without an account id', () => {
    const w = render({ ...blocked, samples: [{ model: 'm', decision: 'block', reason: 'unavailable:quota_rejected:5h' }] })
    expect(w.get('[data-testid="availability-hidden-account"]').text()).toBe('无账号查看权限')
    expect(w.get('[data-testid="availability-reason"]').text()).toBe('不可用：额度窗口 5h 已耗尽')
  })

  it('shows unknown reasons, outcomes and decisions as recorded', async () => {
    const w = render({ v: 1, outcome: 'something_new', candidates: 1, admitted: 0, counts: { brand_new: 1 },
      samples: [{ account_id: 9, decision: 'park', reason: 'brand_new:detail' }, { account_id: 10, decision: 'block', reason: 'unavailable:custom_reason' }] })
    expect(w.get('[data-testid="availability-outcome"]').text()).toBe('something_new')
    expect(w.get('[data-testid="availability-outcome"]').classes()).toContain('badge-gray')
    expect(open(w)).toBe('false')
    await w.get('button[aria-expanded]').trigger('click')
    const reasons = w.findAll('[data-testid="availability-reason"]').map(n => n.text())
    expect(reasons).toEqual(['brand_new:detail', '不可用：custom_reason'])
    expect(w.text()).toContain('park')
    expect(w.text()).toContain('brand_new × 1')
  })

  it('lists guard rechecks with their attempt', () => {
    const w = render({ ...blocked, guard: [{ account_id: 25, decision: 'block', reason: 'guard_identity_changed', attempt: 2 }] })
    const guard = w.get('[data-testid="availability-guard"]')
    expect(guard.text()).toContain('第 2 次尝试')
    expect(guard.text()).toContain('账号已重新授权')
  })

  it('renders nothing for an absent or malformed trace', () => {
    for (const value of [undefined, '{not json', 'null', '[]', '"text"', { outcome: 3 }, { candidates: 1 }]) {
      expect(render(value).find('[data-testid="usage-availability"]').exists(), String(value)).toBe(false)
    }
  })
})

describe('availabilityTrace', () => {
  it('drops ill-typed fields and caps lists', () => {
    const many = Array.from({ length: 80 }, (_, i) => ({ account_id: i + 1, decision: 'block', reason: 'unavailable' }))
    const trace = availabilityTrace(rowWith({
      outcome: 'partial', candidates: '3', admitted: -1, counts: { a: 2, b: 'x', c: -1 }, retry_at: 'soon',
      samples: [...many, null, 'x', { decision: 'block' }], guard: [{ reason: 'guard_models_changed', account_id: 'x', attempt: 1.5 }]
    }))!
    expect(trace.candidates).toBe(0)
    expect(trace.admitted).toBe(0)
    expect(trace.counts).toEqual({ a: 2 })
    expect(trace.retry_at).toBeUndefined()
    expect(trace.samples).toHaveLength(50)
    expect(trace.guard).toEqual([{ decision: '', reason: 'guard_models_changed', attempt: 1 }])
  })
})

describe('availabilityReasonLabel', () => {
  it('labels core codes, plugin reasons and leaves unknown text as recorded', () => {
    i18n.global.locale.value = 'en'
    let tr!: ReturnType<typeof useOptionalT>
    mount({ setup: () => { tr = useOptionalT(); return () => null } }, { global: { plugins: [i18n] } })
    expect(availabilityReasonLabel(tr, 'unavailable:quota_rejected:7d_fable')).toBe('Unavailable: Quota window 7d_fable exhausted')
    expect(availabilityReasonLabel(tr, 'plugin_unknown:invalid_candidate')).toBe('Plugin could not tell: Invalid candidate')
    expect(availabilityReasonLabel(tr, 'snapshot_unavailable')).toBe('Quota snapshot unavailable')
    expect(availabilityReasonLabel(tr, 'upstream_model_mismatch')).toBe('Upstream request model differs from the checked model')
    expect(availabilityReasonLabel(tr, 'unavailable:quota_rejected')).toBe('Unavailable: quota_rejected')
    expect(availabilityReasonLabel(tr, 'mystery:thing')).toBe('mystery:thing')
  })
})
