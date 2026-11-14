import { afterEach, describe, expect, it } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import UsageAttemptChain from './UsageAttemptChain.vue'
import UsageAttemptTrace from './UsageAttemptTrace.vue'
import UsageRetryBadge from './UsageRetryBadge.vue'
import type { UsageRow } from './usage'

enableAutoUnmount(afterEach)

// The hover card's content is rendered in place, to read it without hovering.
const global = {
  plugins: [i18n],
  stubs: { STooltip: { template: '<span><slot /><div data-testid="card"><slot name="content" /></div></span>' } }
}

function rowWith(steps: unknown[] | null, attempts = steps?.length ?? 1): UsageRow {
  return {
    id: 1,
    request_id: 'fixture',
    model: 'fixture-model',
    success: true,
    status_code: 200,
    created_at: '2026-11-15T08:00:00Z',
    account_id: 12,
    account_name: 'claude-main',
    attempts,
    attempt_trail: steps && { v: 1, steps, omitted: 0 }
  } as unknown as UsageRow
}
const failed = (account: object, next = 'switch'): object => ({
  ...account,
  status: 502,
  error_type: 'upstream_error',
  ms: 640,
  message: 'upstream connect error',
  next
})
const served = (account: object): object => ({ ...account, status: 200, ms: 2950 })

function mountWith(component: typeof UsageAttemptChain | typeof UsageRetryBadge | typeof UsageAttemptTrace, row: UsageRow, mine = false) {
  i18n.global.locale.value = 'zh'
  return mount(component, { props: { row, mine }, global })
}
const texts = (w: ReturnType<typeof mountWith>, id: string) => w.findAll(`[data-testid="${id}"]`).map(x => x.text())

describe('UsageAttemptChain', () => {
  it('leads the account cell with the accounts tried before, repeats in a row folded', () => {
    const w = mountWith(
      UsageAttemptChain,
      rowWith([failed({ account_id: 16 }, 'same'), failed({ account_id: 16 }), served({ account_id: 12 })])
    )
    expect(texts(w, 'attempt-link')).toEqual(['#16 ×2'])
    expect(w.get('[data-testid="usage-attempt-chain"]').attributes('aria-label')).toBe('重试 2 次')
    expect(texts(w, 'attempt-account')).toEqual(['#16', '#16', '#12'])
  })

  it('keeps the first and the last of more than three earlier accounts, with the count of the others between', () => {
    const w = mountWith(
      UsageAttemptChain,
      rowWith([12, 13, 16, 13, 19].map(id => failed({ account_id: id })).concat(served({ account_id: 12 })))
    )
    expect(texts(w, 'attempt-link')).toEqual(['#12', '#19'])
    expect(w.get('[data-testid="usage-attempt-chain"]').text()).toBe('#12→+3→#19→')
    expect(texts(w, 'attempt-step')).toHaveLength(6)
  })

  it('is not drawn for a request sent once, nor for a row from before the trail', () => {
    for (const row of [rowWith(null), rowWith(null, 3)]) expect(mountWith(UsageAttemptChain, row).html()).toBe('<!--v-if-->')
  })
})

describe('UsageRetryBadge', () => {
  it('counts the retries and lists each attempt with its account by ID, outcome and time', () => {
    const w = mountWith(UsageRetryBadge, rowWith([failed({ account_id: 16 }), served({ account_id: 12 })]))
    expect(w.get('[data-testid="usage-retry-badge"]').text()).toBe('重试 1')
    const steps = texts(w, 'attempt-step')
    expect(steps[0]).toMatch(/第 1 次\s*#16\s*502 上游错误\s*0\.64 s/)
    expect(steps[1]).toMatch(/第 2 次\s*#12\s*200 成功\s*2\.95 s/)
  })

  it('names an account hidden from an operator without account:read by its number in the request', () => {
    const w = mountWith(
      UsageRetryBadge,
      rowWith([failed({ account_ref: 1 }, 'same'), failed({ account_ref: 1 }), served({ account_ref: 2 })])
    )
    expect(texts(w, 'attempt-account')).toEqual(['账号 1', '账号 1', '账号 2'])
  })

  it("shows no account in the caller's own records", () => {
    const w = mountWith(UsageRetryBadge, rowWith([failed({ account_id: 16 }), served({ account_id: 12 })]), true)
    expect(texts(w, 'attempt-step')).toHaveLength(2)
    expect(w.find('[data-testid="attempt-account"]').exists()).toBe(false)
  })

  it('says a row from before the trail has only the count, and is not drawn for a request sent once', () => {
    const w = mountWith(UsageRetryBadge, rowWith(null, 3))
    expect(w.get('[data-testid="usage-retry-badge"]').text()).toBe('重试 2')
    expect(w.get('[data-testid="attempt-legacy"]').text()).toBe('这条记录早于调用链路功能，只记录了尝试次数')
    expect(mountWith(UsageRetryBadge, rowWith(null)).find('[data-testid="usage-retry-badge"]').exists()).toBe(false)
  })
})

describe('UsageAttemptTrace', () => {
  it('lists every attempt of the detail with the account by ID and name, the upstream error and what came next', () => {
    const w = mountWith(
      UsageAttemptTrace,
      rowWith([
        failed({ account_id: 16, account_name: 'relay-1' }, 'same'),
        failed({ account_id: 16, account_name: 'relay-1' }),
        served({ account_id: 12, account_name: 'claude-main' })
      ])
    )
    expect(w.get('button[aria-expanded]').attributes('aria-expanded')).toBe('true')
    expect(texts(w, 'attempt-account')).toEqual(['#16 relay-1', '#16 relay-1', '#12 claude-main'])
    const steps = texts(w, 'attempt-step')
    expect(steps[0]).toContain('upstream connect error')
    expect(steps[0]).toContain('同账号重试')
    expect(steps[1]).toContain('换账号重试')
    expect(w.text()).toContain('失败的尝试不计费')
  })

  it('shows a code the console does not know as recorded', () => {
    const w = mountWith(
      UsageAttemptTrace,
      rowWith([{ account_id: 16, status: 0, error_type: 'future_reason', ms: 10, next: 'switch' }, served({ account_id: 12 })])
    )
    expect(texts(w, 'attempt-step')[0]).toContain('future_reason')
  })

  it("shows the caller's own records without accounts", () => {
    const w = mountWith(
      UsageAttemptTrace,
      rowWith([
        { status: 502, error_type: 'upstream_error', ms: 640 },
        { status: 200, ms: 2950 }
      ]),
      true
    )
    expect(texts(w, 'attempt-step')).toHaveLength(2)
    expect(w.find('[data-testid="attempt-account"]').exists()).toBe(false)
    expect(w.text()).toContain('本请求在上游失败后被自动重试')
  })

  it('says a row from before the trail has only the count, and renders nothing for a request sent once', () => {
    expect(mountWith(UsageAttemptTrace, rowWith(null, 2)).find('[data-testid="attempt-legacy"]').exists()).toBe(true)
    expect(mountWith(UsageAttemptTrace, rowWith(null)).find('[data-testid="usage-attempts"]').exists()).toBe(false)
  })
})
