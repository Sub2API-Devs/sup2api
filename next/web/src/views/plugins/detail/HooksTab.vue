<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge, SCard, SHint, STable, type TableColumn } from '@sub2api/ui'
import { formatNumber } from '@/utils/format'
import type { PluginDetail } from '../pluginUtil'

const props = defineProps<{ detail: PluginDetail }>()
const { t } = useI18n()

const rows = computed(() => (props.detail.hooks || []).map((h, i) => ({ ...h, _k: `${h.point}#${h.id ?? i}` })))

const columns = computed<TableColumn[]>(() => [
  { key: 'point', label: t('plugins.hooks.point') },
  { key: 'order', label: t('plugins.hooks.order'), align: 'right' },
  { key: 'failure', label: t('plugins.consent.onFailure') },
  { key: 'timeout_ms', label: t('plugins.consent.timeout'), align: 'right' },
  { key: 'needs', label: t('plugins.consent.reads') },
  { key: 'stats', label: t('plugins.hooks.stats') }
])
</script>

<template>
  <SCard :padded="false">
    <STable :columns="columns" :rows="rows" row-key="_k">
      <template #cell-point="{ row }">
        <div class="font-mono text-sm">{{ row.point }}</div>
        <SHint v-if="row.id" size="xs">#{{ row.id }}</SHint>
      </template>
      <template #cell-failure="{ row }">
        <SBadge v-if="row.failure" :tone="row.failure === 'closed' ? 'danger' : 'gray'">
          {{ row.failure === 'closed' ? t('plugins.consent.failClosed') : t('plugins.consent.failOpen') }}
        </SBadge>
        <SHint v-else inline>—</SHint>
      </template>
      <template #cell-timeout_ms="{ row }">{{ row.timeout_ms ? row.timeout_ms + 'ms' : '—' }}</template>
      <template #cell-needs="{ row }">
        <div class="flex flex-wrap gap-1">
          <code v-for="n in row.needs || []" :key="n" class="rounded bg-gray-100 px-1 font-mono text-xs dark:bg-dark-700">{{ n }}</code>
        </div>
      </template>
      <template #cell-stats="{ row }">
        <div v-if="row.stats" class="flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
          <span><SHint inline size="xs">{{ t('plugins.hooks.calls') }}</SHint> {{ formatNumber(row.stats.calls) }}</span>
          <span><SHint inline size="xs">{{ t('plugins.hooks.denied') }}</SHint> {{ formatNumber(row.stats.denied) }}</span>
          <span :class="row.stats.timeouts ? 'text-orange-600' : ''"><SHint inline size="xs">{{ t('plugins.hooks.timeouts') }}</SHint> {{ formatNumber(row.stats.timeouts) }}</span>
          <span><SHint inline size="xs">P99</SHint> {{ row.stats.p99_ms }}ms</span>
          <span>
            <SHint inline size="xs">{{ t('plugins.hooks.breaker') }}</SHint>
            <SBadge :tone="row.stats.breaker_open ? 'danger' : 'success'">{{ row.stats.breaker_open ? t('plugins.hooks.breakerOpen') : t('plugins.hooks.breakerClosed') }}</SBadge>
          </span>
        </div>
        <SHint v-else inline size="xs">{{ t('plugins.hooks.noStats') }}</SHint>
      </template>
    </STable>
  </SCard>
</template>
