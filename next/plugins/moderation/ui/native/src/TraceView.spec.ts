import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { mountPinned } from '@sub2api/ui/testing'
import type { PluginHost } from '@sub2api/host'
import TraceView from './TraceView.vue'
import { setHost } from './host'
import type { Outcome, Trace } from './types'

// The reasons of a trace are not a table column (a table wider than the
// record dialog cut them off): each call with a reason or refused images is
// listed under the table with its stage and auditor, the reason in full.
const long = Array.from({ length: 8 }, (_, i) => `第 ${i + 1} 段：${'很长的理由'.repeat(20)}`).join('\n')
const outcome = (o: Partial<Outcome>): Outcome => ({ auditor_id: 1, calls: 1, hit: false, top_score: 0, latency_ms: 10, ...o })
const trace: Trace = {
  latency_ms: 30,
  stages: [
    { stage: 1, result: 'pass', outcomes: [outcome({ auditor_id: 1 })] },
    { stage: 2, result: 'hit', outcomes: [outcome({ auditor_id: 2, hit: true, reason: long, images_refused: true, status: 413 })] }
  ]
} as unknown as Trace

beforeEach(() => {
  const t = (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key)
  setHost({
    t,
    i18n: { t, formatNumber: String, locale: { value: 'zh' } },
    plugin: { key: 'moderation' },
    pluginApi: { get: vi.fn(async () => []) },
    can: () => true
  } as unknown as PluginHost)
})
afterEach(() => setHost(null))
enableAutoUnmount(afterEach)

describe('the reasons of a trace', () => {
  for (const compact of [false, true]) {
    it(`are listed in full under the table (${compact ? 'phone cards' : 'table'})`, () => {
      const w = mountPinned(TraceView, { props: { trace } }, { compact })
      expect(w.findAll('th').map((th) => th.text())).not.toContain('detail.f.reason')
      const items = w.findAll('.mod-trace-reason')
      expect(items).toHaveLength(1)
      expect(items[0].find('dt').text()).toContain('"n":2')
      expect(items[0].find('dt').text()).toContain('#2')
      expect(items[0].find('.mod-text-warning').text()).toContain('trace.imagesRefused')
      expect(items[0].find('.mod-prewrap').element.textContent).toBe(long)
      expect(w.find('.mod-trace-reasons').attributes('aria-labelledby')).toBe(w.find('.mod-trace-reasons-title').attributes('id'))
    })
  }

  it('leave no list when no call gave one', () => {
    const plain = { ...trace, stages: [trace.stages![0]] } as Trace
    expect(mountPinned(TraceView, { props: { trace: plain } }, { compact: false }).find('.mod-trace-reasons').exists()).toBe(false)
  })
})
