// Phone defaults for an ECharts option (SChart on compact screens): a
// scrolling legend at the bottom, a tooltip kept inside the chart, axis
// labels that hide rather than overlap, and a grid that holds its labels
// (unless the page sized the label margin itself with `left`). Shallow per
// component: every key the page set wins.
type Option = Record<string, any>

const each = (v: any, f: (x: Option) => Option) => (Array.isArray(v) ? v.map(f) : f(v))
const axis = (a: any) => a && each(a, x => ({ ...x, axisLabel: { hideOverlap: true, ...x.axisLabel } }))
const grid = (g: Option): Option => (g.left === undefined ? { containLabel: true, ...g } : g)
const legend = (l: Option): Option => ({ type: 'scroll', ...(l.top === undefined && l.bottom === undefined ? { bottom: 0 } : {}), ...l })

export function compactChartOption(opt: Option): Option {
  return {
    ...opt,
    grid: opt.grid ? each(opt.grid, grid) : { left: 8, right: 8, top: 24, bottom: opt.legend ? 32 : 8, containLabel: true },
    tooltip: { confine: true, ...opt.tooltip },
    legend: opt.legend && each(opt.legend, legend),
    xAxis: axis(opt.xAxis),
    yAxis: axis(opt.yAxis)
  }
}
