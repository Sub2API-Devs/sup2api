// cd ui/native && node --experimental-strip-types --test src/overview/__tests__/chart.test.mts src/overview/__tests__/figures.test.mts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { barOption, bucketLabel, bucketLabels, lineOption, niceMax } from '../chart.ts'

test('bucketLabel by hour uses the given zone', () => {
  assert.equal(bucketLabel('2026-10-31T01:00:00Z', 'hour', 0), '01:00')
  assert.equal(bucketLabel('2026-10-31T01:00:00Z', 'hour', 480), '09:00')
  assert.equal(bucketLabel('2026-10-31T20:00:00Z', 'hour', 480), '04:00')
  assert.equal(bucketLabel('2026-10-31T05:00:00Z', 'hour', -300), '00:00')
})

test('bucketLabel by day labels the zone day of the bucket start', () => {
  // Midnight of 2026-11-01 in UTC+8 is 16:00 UTC the day before.
  assert.equal(bucketLabel('2026-10-31T16:00:00Z', 'day', 480), '11-01')
  assert.equal(bucketLabel('2026-10-31T00:00:00Z', 'day', 0), '10-31')
  assert.equal(bucketLabel('2026-01-01T05:00:00Z', 'day', -300), '01-01')
})

test('bucketLabel keeps an unparsable value', () => {
  assert.equal(bucketLabel('nope', 'hour', 0), 'nope')
})

test('bucketLabels maps every point', () => {
  assert.deepEqual(bucketLabels([{ ts: '2026-10-31T00:00:00Z' }, { ts: '2026-10-31T01:00:00Z' }], 'hour', 0), ['00:00', '01:00'])
})

test('niceMax rounds up to 1, 2, 2.5, 5 or 10 times a power of ten', () => {
  assert.equal(niceMax([]), 1)
  assert.equal(niceMax([0, 0]), 1)
  assert.equal(niceMax([0.4], 0.1), 0.5)
  assert.equal(niceMax([3]), 5)
  assert.equal(niceMax([10]), 10)
  assert.equal(niceMax([11]), 20)
  assert.equal(niceMax([21]), 25)
  assert.equal(niceMax([26]), 50)
  assert.equal(niceMax([51]), 100)
  assert.equal(niceMax([1240, 300]), 2000)
  assert.equal(niceMax([7, NaN, Infinity]), 10)
})

test('lineOption builds one line per series with dashed secondaries', () => {
  const fmt = (v: number) => `${v} ms`
  const o = lineOption(['00:00', '01:00'], [{ name: 'avg', data: [100, 300] }, { name: 'p95', data: [400, 900], dashed: true }], fmt)
  assert.deepEqual(o.xAxis.data, ['00:00', '01:00'])
  assert.equal(o.series.length, 2)
  assert.equal(o.series[0].lineStyle.type, 'solid')
  assert.equal(o.series[1].lineStyle.type, 'dashed')
  assert.equal(o.series[0].showSymbol, false)
  assert.equal(o.yAxis.max, 1000)
  assert.equal(o.yAxis.min, 0)
  assert.deepEqual(o.legend?.data, ['avg', 'p95'])
  assert.equal(o.grid.bottom, 48)
  assert.equal(o.yAxis.axisLabel.formatter(5), '5 ms')
  assert.equal(o.tooltip.valueFormatter(7), '7 ms')
})

test('lineOption without a legend for one series; a single point shows its symbol', () => {
  const o = lineOption(['10-31'], [{ name: 'x', data: [2] }], String)
  assert.equal(o.legend, undefined)
  assert.equal(o.grid.bottom, 28)
  assert.equal(o.series[0].showSymbol, true)
})

test('barOption has one bar series', () => {
  const o = barOption(['a', 'b'], 'cost', [0.1, 0.2], (v) => '$' + v)
  assert.equal(o.series.length, 1)
  assert.equal(o.series[0].type, 'bar')
  assert.deepEqual(o.series[0].data, [0.1, 0.2])
  assert.equal(o.yAxis.axisLabel.formatter(1), '$1')
})
