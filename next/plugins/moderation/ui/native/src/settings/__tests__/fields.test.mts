// cd ui/native && node --experimental-strip-types --test src/settings/__tests__/fields.test.mts src/settings/__tests__/blockPreview.test.mts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULTS, DEFAULT_BLOCK_MESSAGE, NUMBER_FIELDS, diff, jevIssues, toDraft, toStored, validate, withDefaults } from '../fields.ts'

const GUIDE = '内置准则'

test('withDefaults fills only missing keys and keeps the rest', () => {
  const v = withDefaults({ mode: 'observe', base_url: 'x' })
  assert.equal(v.mode, 'observe')
  assert.equal(v.base_url, 'x')
  assert.equal(v.watch_days, 30)
  assert.deepEqual(v.exempt_user_ids, [])
  assert.equal(v.block_message, DEFAULT_BLOCK_MESSAGE)
  assert.equal(v.jev_default_set, null)
})

test('toDraft shows the built-in guidelines when none are stored', () => {
  assert.equal(toDraft(withDefaults({}), GUIDE).analysis_guidelines, GUIDE)
  assert.equal(toDraft(withDefaults({ analysis_guidelines: 'own' }), GUIDE).analysis_guidelines, 'own')
})

test('toDraft copies values, so editing the draft leaves the stored values alone', () => {
  const stored = withDefaults({ exempt_user_ids: ['1'] })
  const d = toDraft(stored, GUIDE)
  d.exempt_user_ids.push('2')
  assert.deepEqual(stored.exempt_user_ids, ['1'])
})

test('an untouched draft has no changes', () => {
  const stored = withDefaults({ analysis_guidelines: '' })
  assert.deepEqual(diff(stored, toStored(toDraft(stored, GUIDE), GUIDE)), {})
})

test('guidelines equal to the built-in text are stored empty', () => {
  const stored = withDefaults({ analysis_guidelines: 'own' })
  const d = toDraft(stored, GUIDE)
  d.analysis_guidelines = '  ' + GUIDE + '\n'
  assert.deepEqual(diff(stored, toStored(d, GUIDE)), { analysis_guidelines: '' })
})

test('diff lists only the changed keys of the page', () => {
  const stored = withDefaults({ mode: 'off', api_key: '******' })
  const d = toDraft(stored, GUIDE)
  d.mode = 'enforce'
  d.watch_days = 7
  d.exempt_user_ids = ['42']
  const patch = diff(stored, toStored(d, GUIDE))
  assert.deepEqual(patch, { mode: 'enforce', watch_days: 7, exempt_user_ids: ['42'] })
  assert.equal('api_key' in patch, false)
})

test('the block message and webhook are trimmed', () => {
  const stored = withDefaults({})
  const d = toDraft(stored, GUIDE)
  d.block_message = '  '
  d.notify_webhook_url = ' https://x.test/hook '
  assert.deepEqual(diff(stored, toStored(d, GUIDE)), { block_message: '', notify_webhook_url: 'https://x.test/hook' })
})

test('validate: defaults are valid', () => {
  assert.deepEqual(validate(toDraft(withDefaults({}), GUIDE)), {})
})

test('validate: numbers must be integers in range', () => {
  const d = toDraft(withDefaults({}), GUIDE)
  d.watch_days = 0
  d.pass_retention_days = 4
  d.queue_size = null
  d.min_chars = 1.5
  const e = validate(d)
  assert.deepEqual(e.watch_days, { code: 'range', params: { min: 1, max: 365 } })
  assert.equal(e.pass_retention_days.code, 'range')
  assert.equal(e.queue_size.code, 'integer')
  assert.equal(e.min_chars.code, 'integer')
})

test('validate: texts, url, ids', () => {
  const d = toDraft(withDefaults({}), GUIDE)
  d.block_message = 'x'.repeat(501)
  d.notify_webhook_url = 'ftp://x'
  d.exempt_user_ids = ['1', 'a']
  d.analysis_guidelines = '字'.repeat(6000)
  const e = validate(d)
  assert.equal(e.block_message.code, 'tooLong')
  assert.equal(e.notify_webhook_url.code, 'url')
  assert.equal(e.exempt_user_ids.code, 'ids')
  assert.equal(e.analysis_guidelines.code, 'tooLong')
  d.block_message = '字'.repeat(500)
  d.notify_webhook_url = ''
  d.exempt_user_ids = Array.from({ length: 1001 }, (_, i) => String(i))
  d.analysis_guidelines = ''
  const e2 = validate(d)
  assert.equal(e2.block_message, undefined)
  assert.equal(e2.notify_webhook_url, undefined)
  assert.equal(e2.exempt_user_ids.code, 'tooMany')
})

test('jevIssues checks the schema of a question set', () => {
  const ok = { preamble: '', items: [{ category: 'custom/jailbreak', question: 'Q?', threshold: 0.85 }] }
  assert.deepEqual(jevIssues(ok), [])
  assert.deepEqual(jevIssues({ preamble: '', items: [] }), [{ index: -1, field: 'items' }])
  const bad = {
    preamble: '',
    items: [
      { category: 'Bad Cat', question: ' ', threshold: 0 },
      { category: 'ok', label: 'x'.repeat(65), question: 'q', threshold: 1.2 }
    ]
  }
  assert.deepEqual(jevIssues(bad), [
    { index: 0, field: 'category' },
    { index: 0, field: 'question' },
    { index: 0, field: 'threshold' },
    { index: 1, field: 'label' },
    { index: 1, field: 'threshold' }
  ])
  const d = toDraft(withDefaults({}), GUIDE)
  d.jev_default_set = bad
  assert.equal(validate(d).jev_default_set.code, 'jev')
})

test('DEFAULTS covers every number field', () => {
  for (const k of Object.keys(NUMBER_FIELDS)) assert.equal(typeof DEFAULTS[k], 'number', k)
})
