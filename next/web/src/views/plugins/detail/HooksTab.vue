<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge, SCard, STable, type TableColumn } from '@sub2api/ui'
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
        <div v-if="row.id" class="text-xs muted">#{{ row.id }}</div>
      </template>
      <template #cell-failure="{ row }">
        <SBadge v-if="row.failure" :tone="row.failure === 'closed' ? 'danger' : 'gray'">
          {{ row.failure === 'closed' ? t('plugins.consent.failClosed') : t('plugins.consent.failOpen') }}
        </SBadge>
        <span v-else class="muted">—</span>
      </template>
      <template #cell-timeout_ms="{ row }">{{ row.timeout_ms ? row.timeout_ms + 'ms' : '—' }}</template>
      <template #cell-needs="{ row }">
        <div class="flex flex-wrap gap-1">
          <code v-for="n in row.needs || []" :key="n" class="rounded bg-gray-100 px-1 font-mono text-xs dark:bg-dark-700">{{ n }}</code>
        </div>
      </template>
      <template #cell-stats="{ row }">
        <div v-if="row.stats" class="flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
          <span><span class="muted">{{ t('plugins.hooks.calls') }}</span> {{ formatNumber(row.stats.calls) }}</span>
          <span><span class="muted">{{ t('plugins.hooks.denied') }}</span> {{ formatNumber(row.stats.denied) }}</span>
          <span :class="row.stats.timeouts ? 'text-orange-600' : ''"><span class="muted">{{ t('plugins.hooks.timeouts') }}</span> {{ formatNumber(row.stats.timeouts) }}</span>
          <span><span class="muted">P99</span> {{ row.stats.p99_ms }}ms</span>
          <span>
            <span class="muted">{{ t('plugins.hooks.breaker') }}</span>
            <SBadge :tone="row.stats.breaker_open ? 'danger' : 'success'">{{ row.stats.breaker_open ? t('plugins.hooks.breakerOpen') : t('plugins.hooks.breakerClosed') }}</SBadge>
          </span>
        </div>
        <span v-else class="text-xs muted">{{ t('plugins.hooks.noStats') }}</span>
      </template>
    </STable>
  </SCard>
</template>
