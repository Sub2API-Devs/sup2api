import { describe, expect, it } from 'vitest'
import messages from './messages'

// zh and en must have the same keys (a missing one shows the raw key).
const keys = (o: unknown, prefix = ''): string[] =>
  o && typeof o === 'object' ? Object.entries(o).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k)) : [prefix]

describe('messages', () => {
  it('zh and en have the same keys', () => {
    const zh = new Set(keys(messages.zh))
    const en = new Set(keys(messages.en))
    expect([...zh].filter((k) => !en.has(k))).toEqual([])
    expect([...en].filter((k) => !zh.has(k))).toEqual([])
  })

  it('has a text for every analysis error code of the backend', () => {
    // internal/moderation: upstream.go ErrType*, analysis.go analysisErr*
    const codes = ['timeout', 'ttft_timeout', 'upstream_error', 'network', 'bad_response', 'no_channel', 'auditor_missing', 'panic', 'canceled', 'no_submit', 'bad_submit', 'disabled', 'stale']
    for (const lang of [messages.zh, messages.en]) expect(codes.filter((c) => !(c in lang.analysisErr))).toEqual([])
  })
})
