<script setup lang="ts">
// Responsive grid: `colsBase` columns on phones (1), `cols` from sm: up;
// md/lg/xl props override per breakpoint. `template` sets an arbitrary
// grid-template-columns (e.g. '1fr 140px') via inline style at every width
// and disables the cols classes; `smTemplate`/`mdTemplate`/`lgTemplate`/
// `xlTemplate` apply one from that breakpoint up (below it the cols classes
// still apply, so phones stay single-column). Numbers map to literal class
// strings so Tailwind sees them when scanning this file; the breakpoint
// templates go through CSS variables for the same reason.
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    cols?: number
    colsBase?: number
    mdCols?: number
    lgCols?: number
    xlCols?: number
    gap?: 2 | 3 | 4 | 6
    template?: string
    smTemplate?: string
    mdTemplate?: string
    lgTemplate?: string
    xlTemplate?: string
  }>(),
  { cols: 2, colsBase: 1, gap: 4 }
)

const BASE: Record<number, string> = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6' }
const SM: Record<number, string> = { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4', 5: 'sm:grid-cols-5', 6: 'sm:grid-cols-6' }
const MD: Record<number, string> = { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4', 5: 'md:grid-cols-5', 6: 'md:grid-cols-6' }
const LG: Record<number, string> = { 1: 'lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5', 6: 'lg:grid-cols-6' }
const XL: Record<number, string> = { 1: 'xl:grid-cols-1', 2: 'xl:grid-cols-2', 3: 'xl:grid-cols-3', 4: 'xl:grid-cols-4', 5: 'xl:grid-cols-5', 6: 'xl:grid-cols-6' }
const GAP: Record<number, string> = { 2: 'gap-2', 3: 'gap-3', 4: 'gap-4', 6: 'gap-6' }

// A breakpoint template replaces the numeric class of that breakpoint.
const cls = computed(() => [
  GAP[props.gap] ?? 'gap-4',
  ...(props.template
    ? []
    : [
        BASE[props.colsBase] ?? 'grid-cols-1',
        props.smTemplate ? 'sm:grid-cols-[var(--s-grid-sm)]' : (SM[props.cols] ?? 'sm:grid-cols-2'),
        props.mdTemplate ? 'md:grid-cols-[var(--s-grid-md)]' : props.mdCols ? MD[props.mdCols] : '',
        props.lgTemplate ? 'lg:grid-cols-[var(--s-grid-lg)]' : props.lgCols ? LG[props.lgCols] : '',
        props.xlTemplate ? 'xl:grid-cols-[var(--s-grid-xl)]' : props.xlCols ? XL[props.xlCols] : ''
      ])
])
const style = computed(() => {
  if (props.template) return { gridTemplateColumns: props.template }
  const s: Record<string, string> = {}
  if (props.smTemplate) s['--s-grid-sm'] = props.smTemplate
  if (props.mdTemplate) s['--s-grid-md'] = props.mdTemplate
  if (props.lgTemplate) s['--s-grid-lg'] = props.lgTemplate
  if (props.xlTemplate) s['--s-grid-xl'] = props.xlTemplate
  return Object.keys(s).length ? s : undefined
})
</script>

<template>
  <div class="grid" :class="cls" :style="style"><slot /></div>
</template>
