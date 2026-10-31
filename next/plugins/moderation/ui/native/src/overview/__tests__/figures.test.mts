// cd ui/native && node --experimental-strip-types --test src/overview/__tests__/chart.test.mts src/overview/__tests__/figures.test.mts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { latencyOverflow, nodeRows, overAlert, percent, ratio, reviewShares, thresholdsTooStrict, topCosts, unboundGroups } from '../figures.ts'

const cost = (c: string, calls: number, unpriced = 0) => ({ cost: c, calls, priced_calls: calls - unpriced, unpriced_calls: unpriced, unpriced_tokens: 0, free_calls: 0, tokens_in: 0, tokens_out: 0 })

test('ratio and percent', () => {
  assert.equal(ratio(1, 0), 0)
  assert.equal(ratio(1, 4), 0.25)
  assert.equal(percent(0.125), '12.5%')
  assert.equal(percent(0.1), '10%')
  assert.equal(percent(1), '100%')
  assert.equal(percent(0), '0%')
  assert.equal(percent(0.0004), '0%')
  assert.equal(percent(0.1, 0), '10%')
  assert.equal(percent(NaN), '0%')
})

test('overAlert: strictly above the threshold, 0 disables', () => {
  assert.equal(overAlert(0.06, 5), true)
  assert.equal(overAlert(0.05, 5), false)
  assert.equal(overAlert(0.9, 0), false)
})

test('latencyOverflow above 10 s', () => {
  assert.equal(latencyOverflow(10000), false)
  assert.equal(latencyOverflow(10001), true)
})

test('nodeRows sums the points and derives the rates', () => {
  const rows = nodeRows([
    { flow_id: 1, stage: 2, auditor_id: 7, points: [
      { ts: 'a', audited: 10, hit: 1, errors: 0, hit_rate: 0.1, error_rate: 0 },
      { ts: 'b', audited: 30, hit: 3, errors: 4, hit_rate: 0.1, error_rate: 0.13 }
    ] },
    { flow_id: 1, stage: 1, auditor_id: 3, points: [] }
  ])
  assert.equal(rows.length, 2)
  assert.deepEqual(rows[0], { key: '1-2-7', flow_id: 1, stage: 2, auditor_id: 7, audited: 40, hit: 4, errors: 4, hitRate: 0.1, errorRate: 0.1 })
  assert.equal(rows[1].hitRate, 0)
  assert.deepEqual(nodeRows(null), [])
})

test('unboundGroups', () => {
  assert.deepEqual(unboundGroups([1, 2, 3], [2]), [1, 3])
  assert.deepEqual(unboundGroups([1], null), [1])
})

test('reviewShares and thresholdsTooStrict', () => {
  const r = { reviewed: 10, violation: 5, false_positive: 4, unsure: 1 }
  assert.deepEqual(reviewShares(r).map((s) => [s.key, s.count, s.ratio]), [['violation', 5, 0.5], ['false_positive', 4, 0.4], ['unsure', 1, 0.1]])
  assert.equal(thresholdsTooStrict(r), true)
  assert.equal(thresholdsTooStrict({ reviewed: 4, violation: 0, false_positive: 4, unsure: 0 }), false)
  assert.equal(thresholdsTooStrict({ reviewed: 10, violation: 7, false_positive: 3, unsure: 0 }), false)
  assert.equal(thresholdsTooStrict(null), false)
  assert.deepEqual(reviewShares(undefined).map((s) => s.ratio), [0, 0, 0])
})

test('topCosts drops rows without calls and sorts by amount, then unpriced calls', () => {
  const rows = [
    { id: 1, cost: cost('0.5', 3) },
    { id: 2, cost: cost('0', 0) },
    { id: 3, cost: cost('2', 1) },
    { id: 4, cost: cost('0', 5, 5) },
    { id: 5, cost: cost('0', 5, 1) }
  ]
  assert.deepEqual(topCosts(rows).map((r) => r.id), [3, 1, 4, 5])
  assert.deepEqual(topCosts(rows, 2).map((r) => r.id), [3, 1])
  assert.deepEqual(topCosts(null), [])
})
