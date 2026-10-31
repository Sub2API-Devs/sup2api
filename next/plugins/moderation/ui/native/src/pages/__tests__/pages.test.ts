// @ts-nocheck -- run by node (strip-types), not part of the bundle; node types are not installed here.
// Pure helpers of the pages area. Run:
//   node --experimental-strip-types --test src/pages/__tests__/pages.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { presetThresholds, thresholdPresetOf, parseThresholds } from '../thresholds.ts'
import { topScores, scoreTone, storedThresholds } from '../scores.ts'
import { messageParts } from '../inputParts.ts'
import { proxyField, proxyNeedsKey, toggleBody, validProxy } from '../channelForm.ts'
import { distribution, nextAnalysis } from '../watchSummary.ts'
import { stageMarks, stageRole } from '../stagePath.ts'

const CATS = ['sexual', 'hate', 'violence']
const DEF = { sexual: 0.65, hate: 0.65, violence: 0.95 }

test('presets scale the defaults, capped at 1', () => {
  assert.deepEqual(presetThresholds(1, CATS, DEF), {})
  assert.deepEqual(presetThresholds(1.1, CATS, DEF), { sexual: 0.72, hate: 0.72, violence: 1 })
  assert.deepEqual(presetThresholds(0.75, CATS, DEF), { sexual: 0.49, hate: 0.49, violence: 0.71 })
})

test('preset detection', () => {
  assert.equal(thresholdPresetOf({}, CATS, DEF), 'default')
  assert.equal(thresholdPresetOf({ sexual: 0.65 }, CATS, DEF), 'default')
  assert.equal(thresholdPresetOf(presetThresholds(1.1, CATS, DEF), CATS, DEF), 'loose')
  assert.equal(thresholdPresetOf(presetThresholds(0.75, CATS, DEF), CATS, DEF), 'strict')
  assert.equal(thresholdPresetOf({ sexual: 0.5 }, CATS, DEF), null)
  assert.equal(thresholdPresetOf({ ...presetThresholds(0.75, CATS, DEF), hate: 0.3 }, CATS, DEF), null)
})

test('parseThresholds drops empty values', () => {
  assert.deepEqual(parseThresholds({ sexual: '0.5', hate: '', violence: ' ', x: null }), { sexual: 0.5 })
})

const trace = (outcomes: any[][]) => ({ stages: outcomes.map((o) => ({ outcomes: o, result: 'pass' })), final: 'pass', decider: -1, latency_ms: 0 }) as any

test('topScores merges top[] by best ratio and sorts', () => {
  const tr = trace([
    [{ auditor_id: 1, calls: 1, hit: false, top_score: 0, latency_ms: 0, top: [{ category: 'sexual', score: 0.4, threshold: 0.5 }, { category: 'hate', score: 0.1, threshold: 0.65 }] }],
    [{ auditor_id: 2, calls: 1, hit: true, top_score: 0, latency_ms: 0, top: [{ category: 'sexual', score: 0.95, threshold: 0.9 }, { category: 'illicit', score: 0.5, threshold: 0.85 }, { category: 'x', score: 0, threshold: 1 }] }]
  ])
  const r = topScores(tr)
  assert.deepEqual(r.map((s) => s.category), ['sexual', 'illicit', 'hate'])
  assert.equal(r[0].score, 0.95)
  assert.equal(scoreTone(r[0]), 'over')
  assert.equal(scoreTone({ category: 'a', score: 0.41, threshold: 0.5 }), 'near')
  assert.equal(scoreTone({ category: 'a', score: 0.1, threshold: 0.5 }), 'low')
  assert.equal(scoreTone({ category: 'a', score: 0, threshold: 0 }), 'over')
})

test('topScores falls back to hits; storedThresholds per auditor', () => {
  const tr = trace([[{ auditor_id: 3, calls: 1, hit: true, top_score: 0.9, latency_ms: 0, hits: [{ category: 'hate', score: 0.9, threshold: 0.65 }] }]])
  assert.deepEqual(topScores(tr), [{ category: 'hate', label: undefined, score: 0.9, threshold: 0.65 }])
  assert.equal(storedThresholds(tr).get(3)?.get('hate'), 0.65)
  assert.deepEqual(topScores(null), [])
})

test('messageParts reads chat, anthropic, responses and gemini shapes', () => {
  const parts = messageParts([
    { role: 'user', content: 'hello' },
    { role: 'user', content: [{ type: 'text', text: 'a' }, { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AAA' } }] },
    { role: 'user', content: [{ type: 'image_url', image_url: { url: 'https://x/y.png' } }, { type: 'input_image', image_url: 'data:image/jpeg;base64,BBB' }, { type: 'input_text', text: '  ' }] },
    { role: 'user', content: [{ type: 'image', source: { type: 'url', url: 'javascript:alert(1)' } }] },
    { role: 'user', parts: [{ text: 'g' }, { inlineData: { mimeType: 'image/webp', data: 'CCC' } }, { fileData: { mimeType: 'image/png', fileUri: 'https://f/z' } }, { inline_data: { mime_type: 'text/plain', data: 'D' } }] }
  ])
  assert.deepEqual(parts, [
    { type: 'text', text: 'hello' },
    { type: 'text', text: 'a' },
    { type: 'image', src: 'data:image/png;base64,AAA', kind: 'data', mime: 'image/png' },
    { type: 'image', src: 'https://x/y.png', kind: 'url', mime: '' },
    { type: 'image', src: 'data:image/jpeg;base64,BBB', kind: 'data', mime: 'image/jpeg' },
    { type: 'image', src: '', kind: 'url', mime: '' },
    { type: 'text', text: 'g' },
    { type: 'image', src: 'data:image/webp;base64,CCC', kind: 'data', mime: 'image/webp' },
    { type: 'image', src: 'https://f/z', kind: 'url', mime: 'image/png' }
  ])
  assert.deepEqual(messageParts(null), [])
  assert.deepEqual(messageParts([{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: '', data: 'Z' } }] }]), [{ type: 'image', src: '', kind: 'data', mime: '' }])
})

test('proxy field: not sent = keep, "" = clear, a change needs the key', () => {
  assert.equal(proxyField('', { creating: true, hadProxy: false, empty: 'keep' }), undefined)
  assert.equal(proxyField(' socks5://h:1 ', { creating: true, hadProxy: false, empty: 'keep' }), 'socks5://h:1')
  assert.equal(proxyField('', { creating: false, hadProxy: true, empty: 'keep' }), undefined)
  assert.equal(proxyField('', { creating: false, hadProxy: true, empty: 'clear' }), '')
  assert.equal(proxyField('', { creating: false, hadProxy: false, empty: 'clear' }), undefined)
  assert.equal(proxyNeedsKey(undefined, { creating: false, hasKey: true, newKey: '' }), false)
  assert.equal(proxyNeedsKey('', { creating: false, hasKey: true, newKey: '' }), true)
  assert.equal(proxyNeedsKey('http://p', { creating: false, hasKey: true, newKey: 'sk' }), false)
  assert.equal(proxyNeedsKey('http://p', { creating: true, hasKey: false, newKey: '' }), false)
  assert.equal(proxyNeedsKey('http://p', { creating: false, hasKey: false, newKey: '' }), false)
  assert.ok(validProxy('http://u:p@h:8080'))
  assert.ok(validProxy('SOCKS5://h:1080'))
  assert.ok(!validProxy('ftp://h'))
  assert.ok(!validProxy('h:8080'))
})

test('toggleBody keeps the key and the proxy out', () => {
  const c: any = { id: 1, type: 'llm', protocol: 'anthropic', name: 'n', base_url: 'u', model: 'm', billing_model: '', timeout_ms: 1000, enabled: true, has_key: true, has_proxy: true }
  assert.deepEqual(toggleBody(c, false), { type: 'llm', protocol: 'anthropic', name: 'n', base_url: 'u', model: 'm', billing_model: '', timeout_ms: 1000, enabled: false })
  assert.equal('protocol' in toggleBody({ ...c, type: 'typesafe' }, true), false)
})

test('watch distribution and next analysis', () => {
  const d = distribution([
    { review_status: 'pending', severity: 'high', ai_verdict: 'violation' },
    { review_status: 'false_positive', severity: 'low', ai_verdict: '' },
    { review_status: 'confirmed', severity: 'medium', ai_verdict: 'unsure' }
  ] as any)
  assert.deepEqual(d, { total: 3, review: { pending: 1, false_positive: 1, confirmed: 1 }, severity: { high: 1, medium: 1, low: 1 }, ai: { violation: 1, false_positive: 0, unsure: 1, none: 1 } })
  assert.deepEqual(nextAnalysis({ level: 'observe', violation_count: 28, analysis_running: false }, 30), { kind: 'progress', count: 28, every: 30, left: 2, near: true })
  assert.deepEqual(nextAnalysis({ level: 'observe', violation_count: 2, analysis_running: false }, 0), { kind: 'off', count: 2 })
  assert.equal(nextAnalysis({ level: 'enforce', violation_count: 2, analysis_running: false }, 30).kind, 'manual_only')
  assert.equal(nextAnalysis({ level: 'observe', violation_count: 2, analysis_running: true }, 30).kind, 'running')
})

test('stage marks and roles', () => {
  const tr = trace([
    [{ auditor_id: 1, calls: 1, hit: true, top_score: 0, latency_ms: 0 }],
    [{ auditor_id: 2, calls: 1, hit: false, top_score: 0, latency_ms: 0, err: 'timeout' }, { auditor_id: 3, calls: 0, hit: false, top_score: 0, latency_ms: 0, skipped: true }]
  ])
  const m = stageMarks(tr, (id) => (id === 3 ? 'typesafe' : 'openai_moderation'))
  assert.deepEqual(m.map((s) => [s.stage, s.role, s.skipped, s.auditors.map((a) => a.mark)]), [
    [1, 'first', false, ['hit']],
    [2, 'behavior', false, ['error', 'skipped']]
  ])
  assert.equal(stageRole(2, ['openai_moderation']), 'review')
})
