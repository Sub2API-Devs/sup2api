<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'

// ECharts wrapper. echarts is loaded lazily so pages without charts don't
// pay for it. The option is applied as-is; colors/text adapt to dark mode.
const props = withDefaults(defineProps<{ option: Record<string, any>; height?: string; loading?: boolean }>(), {
  height: '280px'
})

const el = ref<HTMLDivElement>()
const chart = shallowRef<any>(null)
const dark = ref(document.documentElement.classList.contains('dark'))
let ro: ResizeObserver | null = null
let mo: MutationObserver | null = null
let echartsMod: any = null

async function loadEcharts() {
  if (echartsMod) return echartsMod
  const [core, charts, components, renderers] = await Promise.all([
    import('echarts/core'),
    import('echarts/charts'),
    import('echarts/components'),
    import('echarts/renderers')
  ])
  core.use([
    charts.LineChart,
    charts.BarChart,
    charts.PieChart,
    components.GridComponent,
    components.TooltipComponent,
    components.LegendComponent,
    components.TitleComponent,
    components.DatasetComponent,
    renderers.CanvasRenderer
  ])
  echartsMod = core
  return core
}

function themed(opt: Record<string, any>) {
  const text = dark.value ? '#cbd5e1' : '#475569'
  const line = dark.value ? '#334155' : '#e2e8f0'
  return {
    color: ['#14b8a6', '#6366f1', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#84cc16'],
    backgroundColor: 'transparent',
    textStyle: { color: text },
    grid: { left: 48, right: 16, top: 32, bottom: 32, containLabel: false },
    tooltip: { trigger: 'axis' },
    ...opt,
    legend: opt.legend ? { textStyle: { color: text }, ...opt.legend } : undefined,
    xAxis: axis(opt.xAxis, text, line),
    yAxis: axis(opt.yAxis, text, line)
  }
}

function axis(a: any, text: string, line: string) {
  if (!a) return a
  const f = (x: any) => ({
    axisLabel: { color: text },
    axisLine: { lineStyle: { color: line } },
    splitLine: { lineStyle: { color: line } },
    ...x
  })
  return Array.isArray(a) ? a.map(f) : f(a)
}

async function render() {
  if (!el.value) return
  const ec = await loadEcharts()
  if (!el.value) return
  if (!chart.value) chart.value = ec.init(el.value, undefined, { renderer: 'canvas' })
  chart.value.setOption(themed(props.option), true)
  if (props.loading) chart.value.showLoading('default', { maskColor: 'transparent', text: '' })
  else chart.value.hideLoading()
}

onMounted(() => {
  render()
  ro = new ResizeObserver(() => chart.value?.resize())
  if (el.value) ro.observe(el.value)
  mo = new MutationObserver(() => {
    const d = document.documentElement.classList.contains('dark')
    if (d !== dark.value) dark.value = d
  })
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})

watch(() => [props.option, props.loading, dark.value], render, { deep: true })

onBeforeUnmount(() => {
  ro?.disconnect()
  mo?.disconnect()
  chart.value?.dispose()
})
</script>

<template>
  <div ref="el" :style="{ height, width: '100%' }" />
</template>
