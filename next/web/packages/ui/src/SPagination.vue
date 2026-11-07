<script setup lang="ts">
import { computed } from 'vue'
import { useUiT } from './i18n'
import SSelect from './SSelect.vue'
import SIcon from './SIcon.vue'
import PageJump from './internal/PageJump.vue'
import { useViewport } from './viewport'

// Pager: total count, rows-per-page select (changing it also emits page 1),
// previous / numbered / next buttons. `hideSizes` drops the select; `size`
// md uses full-height controls. `mode` simple shows only ‹ page / pages ›
// with 40px arrows, the page label opening a bottom sheet to jump to a page
// and pick the page size; full is the numbered pager; auto (default) is
// simple on a compact screen and full otherwise.
const props = withDefaults(
  defineProps<{ page: number; pageSize: number; total: number; pageSizes?: number[]; hideSizes?: boolean; size?: 'sm' | 'md'; mode?: 'auto' | 'full' | 'simple' }>(),
  { pageSizes: () => [20, 50, 100], size: 'sm', mode: 'auto' }
)
const emit = defineEmits<{ (e: 'update:page', v: number): void; (e: 'update:pageSize', v: number): void }>()
const t = useUiT()
const { compact } = useViewport()
const simple = computed(() => props.mode === 'simple' || (props.mode === 'auto' && compact.value))

const pages = computed(() => Math.max(1, Math.ceil(props.total / Math.max(1, props.pageSize))))

const visible = computed(() => {
  if (simple.value) return []
  const n = pages.value
  const cur = props.page
  const out: (number | '…')[] = []
  const push = (x: number | '…') => out[out.length - 1] !== x && out.push(x)
  for (let i = 1; i <= n; i++) {
    if (i === 1 || i === n || Math.abs(i - cur) <= 1) push(i)
    else push('…')
  }
  return out
})
const sizeOptions = computed(() => props.pageSizes.map((s) => ({ value: s, label: t('ui.perPage', { n: s }) })))

function go(p: number) {
  if (p < 1 || p > pages.value || p === props.page) return
  emit('update:page', p)
}
function setSize(v: unknown) {
  emit('update:pageSize', Number(v))
  emit('update:page', 1)
}
const BTN = { sm: 'btn-sm min-w-[2rem]', md: 'btn-md min-w-[2.5rem]', simple: 'h-10 min-w-[2.5rem]' }
const btn = computed(() => BTN[simple.value ? 'simple' : props.size])
</script>

<template>
  <nav class="flex flex-wrap items-center justify-between gap-3 py-3 text-sm text-gray-500 dark:text-dark-400" :aria-label="t('ui.pagination')">
    <span>{{ t('ui.total', { n: total }) }}</span>
    <div class="flex items-center gap-1">
      <SSelect v-if="!hideSizes && !simple" class="!w-auto" :size="size" :model-value="pageSize" :options="sizeOptions" :aria-label="t('ui.pageSize')" @update:model-value="setSize" />
      <button type="button" class="btn btn-ghost px-0" :class="btn" :disabled="page <= 1" :aria-label="t('ui.prev')" @click="go(page - 1)">
        <SIcon name="chevron-right" class="h-4 w-4 rotate-180" />
      </button>
      <PageJump v-if="simple" :page="page" :pages="pages" :page-size="pageSize" :sizes="hideSizes ? [] : sizeOptions" @go="go" @size="setSize" />
      <template v-for="(p, i) in visible" :key="i">
        <span v-if="p === '…'" class="px-1" aria-hidden="true">…</span>
        <button
          v-else
          type="button"
          class="btn"
          :class="[btn, p === page ? 'btn-primary' : 'btn-ghost']"
          :aria-label="t('ui.page', { n: p })"
          :aria-current="p === page ? 'page' : undefined"
          @click="go(p)"
        >
          {{ p }}
        </button>
      </template>
      <button type="button" class="btn btn-ghost px-0" :class="btn" :disabled="page >= pages" :aria-label="t('ui.next')" @click="go(page + 1)">
        <SIcon name="chevron-right" class="h-4 w-4" />
      </button>
    </div>
  </nav>
</template>
