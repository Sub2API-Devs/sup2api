<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{ page: number; pageSize: number; total: number; pageSizes?: number[] }>(),
  { pageSizes: () => [20, 50, 100] }
)
const emit = defineEmits<{ (e: 'update:page', v: number): void; (e: 'update:pageSize', v: number): void }>()
const { t } = useI18n()

const pages = computed(() => Math.max(1, Math.ceil(props.total / Math.max(1, props.pageSize))))

const visible = computed(() => {
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

function go(p: number) {
  if (p < 1 || p > pages.value || p === props.page) return
  emit('update:page', p)
}
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3 py-3 text-sm text-gray-500 dark:text-dark-400">
    <span>{{ t('ui.total', { n: total }) }}</span>
    <div class="flex items-center gap-1">
      <select
        class="input !w-auto !py-1.5 !pr-8 !text-xs"
        :value="pageSize"
        @change="emit('update:pageSize', Number(($event.target as HTMLSelectElement).value)); emit('update:page', 1)"
      >
        <option v-for="s in pageSizes" :key="s" :value="s">{{ t('ui.perPage', { n: s }) }}</option>
      </select>
      <button class="btn btn-ghost btn-sm" :disabled="page <= 1" @click="go(page - 1)">‹</button>
      <template v-for="(p, i) in visible" :key="i">
        <span v-if="p === '…'" class="px-1">…</span>
        <button
          v-else
          class="btn btn-sm min-w-[2rem]"
          :class="p === page ? 'btn-primary' : 'btn-ghost'"
          @click="go(p)"
        >
          {{ p }}
        </button>
      </template>
      <button class="btn btn-ghost btn-sm" :disabled="page >= pages" @click="go(page + 1)">›</button>
    </div>
  </div>
</template>
