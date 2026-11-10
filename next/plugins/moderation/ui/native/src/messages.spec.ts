import { describe, expect, it } from 'vitest'
import messages from './messages'
import { validateSpec } from './flowOps'
import type { Spec } from './types'

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

  // 0.8.0 (new-api parity): the names the views build keys from.
  it('has a text for every auditor type, stage role, stage state and default level', () => {
    for (const lang of [messages.zh, messages.en]) {
      expect(['openai_moderation', 'typesafe', 'llm_verdict', 'llm_questions'].filter((k) => !(k in lang.auditorType))).toEqual([])
      expect(['first', 'behavior', 'review', 'fallback'].filter((k) => !(k in lang.flows.role))).toEqual([])
      expect(['hit', 'pass', 'skipped', 'failed'].filter((k) => !(k in lang.stageResult))).toEqual([])
      for (const group of [lang.mode, lang.statusLine.level, lang.statusLine.levelHint]) expect(Object.keys(group).sort()).toEqual(['enforce', 'observe', 'off'])
      expect(Object.keys(lang.bindings.flowState).sort()).toEqual(['disabled', 'missing', 'unpublished'])
    }
  })

  it('has a text for the issues of a flow with misplaced fallback stages', () => {
    const bad: Spec = { model_filter: { type: 'all', models: [] }, sample_rate: 100, total_timeout_ms: 0, stages: [{ auditors: [1], combine: 'any', fallback: true }, { auditors: [1], combine: 'any' }] }
    const codes = validateSpec(bad, () => 'openai_moderation').map((i) => i.code)
    expect(codes).toEqual(['fallback_first', 'fallback_order'])
    for (const lang of [messages.zh, messages.en]) expect(codes.filter((c) => !(c in lang.flows.issue))).toEqual([])
  })

  it('no longer says that an errored stage passes, or that exempt users are left unmoderated', () => {
    const all = (o: unknown): string[] => (o && typeof o === 'object' ? Object.values(o).flatMap(all) : [String(o)])
    const zh = all(messages.zh).join('\n')
    const en = all(messages.en).join('\n')
    for (const old of ['按通过处理', '出错一律放行', '出错放行', '本级按通过', '所在级放行', '本级放行', '免审用户']) expect(zh).not.toContain(old)
    for (const old of ['treated as a pass', 'Errors always allow', 'errors allow', 'this stage passes', 'its stage allows', 'the stage allows', 'exempt users']) expect(en).not.toContain(old)
  })

  it('has a text for every analysis error code of the backend', () => {
    // internal/moderation: upstream.go ErrType*, analysis.go analysisErr*
    const codes = ['timeout', 'ttft_timeout', 'upstream_error', 'network', 'bad_response', 'no_channel', 'auditor_missing', 'panic', 'canceled', 'no_submit', 'bad_submit', 'disabled', 'stale']
    for (const lang of [messages.zh, messages.en]) expect(codes.filter((c) => !(c in lang.analysisErr))).toEqual([])
  })
})
