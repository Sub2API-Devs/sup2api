import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import { compactChartOption } from './chart'
import { mountPinned } from './testViewport'
import SChart from './SChart.vue'

const setOption = vi.fn()
vi.mock('echarts/core', () => ({
  use: () => {},
  init: () => ({ setOption, resize: () => {}, hideLoading: () => {}, showLoading: () => {}, dispose: () => {} })
}))
vi.mock('echarts/charts', () => ({ LineChart: {}, BarChart: {}, PieChart: {} }))
vi.mock('echarts/components', () => ({
  GridComponent: {},
  TooltipComponent: {},
  LegendComponent: {},
  TitleComponent: {},
  DatasetComponent: {}
}))
vi.mock('echarts/renderers', () => ({ CanvasRenderer: {} }))

enableAutoUnmount(afterEach)
afterEach(() => setOption.mockClear())

describe('compactChartOption', () => {
  it('fills phone defaults into an option that sets none', () => {
    const out = compactChartOption({ legend: {}, xAxis: { type: 'category' }, yAxis: [{ type: 'value' }, { type: 'value' }], series: [] })
    expect(out.legend).toEqual({ type: 'scroll', bottom: 0 })
    expect(out.tooltip).toEqual({ confine: true })
    expect(out.grid).toEqual({ left: 8, right: 8, top: 24, bottom: 32, containLabel: true })
    expect(out.xAxis).toEqual({ type: 'category', axisLabel: { hideOverlap: true } })
    expect(out.yAxis).toEqual([
      { type: 'value', axisLabel: { hideOverlap: true } },
      { type: 'value', axisLabel: { hideOverlap: true } }
    ])
    expect(out.series).toEqual([])
  })

  it('keeps every key the page set', () => {
    const page = {
      legend: { top: 0, type: 'plain' },
      tooltip: { trigger: 'item', confine: false },
      grid: { left: 52, containLabel: false },
      xAxis: { axisLabel: { hideOverlap: false, rotate: 30 } }
    }
    const out = compactChartOption(page)
    expect(out.legend).toEqual({ top: 0, type: 'plain' })
    expect(out.tooltip).toEqual({ trigger: 'item', confine: false })
    expect(out.grid).toEqual({ left: 52, containLabel: false })
    expect(out.xAxis).toEqual({ axisLabel: { hideOverlap: false, rotate: 30 } })
    expect(page.grid).toEqual({ left: 52, containLabel: false })
  })

  it('holds the labels in a page grid unless the page sized their margin', () => {
    expect(compactChartOption({ grid: { top: 36 } }).grid).toEqual({ containLabel: true, top: 36 })
    expect(compactChartOption({ grid: [{ left: 52 }, { bottom: 0 }] }).grid).toEqual([{ left: 52 }, { containLabel: true, bottom: 0 }])
  })

  it('adds no legend or axes the page did not ask for', () => {
    const out = compactChartOption({ series: [{ type: 'pie' }] })
    expect(out.legend).toBeUndefined()
    expect(out.xAxis).toBeUndefined()
    expect(out.grid.bottom).toBe(8)
  })
})

describe('SChart on phones', () => {
  const chart = (compact: boolean, props: { option: Record<string, unknown>; height?: string }) =>
    mountPinned(SChart, { props }, { compact })

  it('is 220px high and draws the phone option', async () => {
    const w = chart(true, { option: { legend: {}, xAxis: {}, yAxis: {} } })
    await flushPromises()
    expect((w.element as HTMLElement).style.height).toBe('220px')
    const drawn = setOption.mock.calls.at(-1)![0]
    expect(drawn.legend).toMatchObject({ type: 'scroll', bottom: 0 })
    expect(drawn.tooltip.confine).toBe(true)
  })

  it('keeps an explicit height', () => {
    expect((chart(true, { option: {}, height: '160px' }).element as HTMLElement).style.height).toBe('160px')
  })

  it('stays 280px with the option as given on wide screens', async () => {
    const w = chart(false, { option: { legend: {} } })
    await flushPromises()
    expect((w.element as HTMLElement).style.height).toBe('280px')
    expect(setOption.mock.calls.at(-1)![0].legend.type).toBeUndefined()
  })
})
