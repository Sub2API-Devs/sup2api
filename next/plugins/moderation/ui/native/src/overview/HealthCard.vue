<script setup lang="ts">
import { computed } from 'vue'
import { SBadge, SCard, SHint, SLink, SSectionTitle, STable, type TableColumn } from '@sub2api/ui'
import { enumLabel, useModHost } from '../host'
import type { HealthRow } from '../stats'
import { overAlert } from './figures'
import { useOverviewData } from './useOverview'
import { useFormat } from './format'
import QueueStatus from './QueueStatus.vue'

// Auditors and channels in the last hour (status.auditors / channels): calls,
// hit and error rate; flagged rows (enough samples above the alert
// threshold) are red. Below: the queues of this node.
const emit = defineEmits<{ (e: 'go-tab', tab: string): void }>()
const ov = useOverviewData()
const t = useModHost().t
const { n, pct } = useFormat()

const s = computed(() => ov.status.data.value)
const alertPercent = computed(() => s.value?.error_rate_alert_percent ?? 5)
const red = (r: HealthRow) => r.flagged || overAlert(r.error_rate, alertPercent.value)

const auditorColumns = computed<TableColumn[]>(() => [
  { key: 'name', label: t('overviewP3.col.auditor') },
  { key: 'channel', label: t('overviewP3.col.channel') },
  { key: 'calls', label: t('overviewP3.health.calls'), align: 'right', nowrap: true },
  { key: 'hit', label: t('overviewP3.col.hitRate'), align: 'right', nowrap: true },
  { key: 'error', label: t('overviewP3.health.errorRate'), align: 'right', nowrap: true }
])
const channelColumns = computed<TableColumn[]>(() => [
  { key: 'name', label: t('overviewP3.col.channel') },
  { key: 'calls', label: t('overviewP3.health.calls'), align: 'right', nowrap: true },
  { key: 'error', label: t('overviewP3.health.errorRate'), align: 'right', nowrap: true }
])

const auditorOf = (id: number) => ov.auditorById.value.get(id)
const channelOf = (id: number | undefined) => (id ? ov.channelById.value.get(id) : undefined)
/** Channel state of an auditor: its name and whether it is gone or disabled. */
function auditorChannel(id: number) {
  const a = auditorOf(id)
  if (!a) return null
  const c = channelOf(a.channel_id)
  return { name: ov.channelName(a.channel_id), gone: !c, disabled: !!c && !c.enabled }
}
</script>

<template>
  <SCard :title="t('overviewP3.health.title')" :subtitle="t('overviewP3.health.hint', { p: alertPercent })">
    <template #actions>
      <span class="mod-ov-links">
        <SLink as="button" @click="emit('go-tab', 'channels')">{{ t('tabs.channels') }}</SLink>
        <SLink as="button" @click="emit('go-tab', 'auditors')">{{ t('tabs.auditors') }}</SLink>
      </span>
    </template>
    <div class="mod-ov-health">
      <STable :columns="auditorColumns" :rows="s?.auditors || []" row-key="id" :empty-text="t('overviewP3.health.noAuditors')" dense>
        <template #cell-name="{ row }">
          {{ ov.auditorName(row.id) }}
          <span v-if="auditorOf(row.id)" class="mod-sub mod-ov-after">{{ enumLabel('auditorType', auditorOf(row.id)?.type) }}</span>
        </template>
        <template #cell-channel="{ row }">
          <template v-if="auditorChannel(row.id)">
            {{ auditorChannel(row.id)?.name }}
            <SBadge v-if="auditorChannel(row.id)?.gone" tone="danger" size="xs" class="mod-ml">{{ t('overviewP3.health.channelGone') }}</SBadge>
            <SBadge v-else-if="auditorChannel(row.id)?.disabled" tone="gray" size="xs" class="mod-ml">{{ t('disabled') }}</SBadge>
          </template>
          <template v-else>—</template>
        </template>
        <template #cell-calls="{ row }">
          <span class="mod-num">{{ n(row.calls) }}</span>
          <div v-if="row.skipped_no_text" class="mod-sub mod-num">{{ t('overviewP3.health.skipped', { n: n(row.skipped_no_text) }) }}</div>
        </template>
        <template #cell-hit="{ row }"><span class="mod-num">{{ pct(row.hit_rate) }}</span></template>
        <template #cell-error="{ row }">
          <SBadge v-if="red(row)" tone="danger" size="xs" class="mod-num">{{ pct(row.error_rate) }}</SBadge>
          <span v-else class="mod-num">{{ pct(row.error_rate) }}</span>
        </template>
      </STable>

      <STable :columns="channelColumns" :rows="s?.channels || []" row-key="id" :empty-text="t('overviewP3.health.noChannels')" dense>
        <template #cell-name="{ row }">
          {{ ov.channelName(row.id) }}
          <template v-if="channelOf(row.id)">
            <span class="mod-sub mod-ov-after">{{ enumLabel('channelType', channelOf(row.id)?.type) }}</span>
            <SBadge v-if="channelOf(row.id)?.is_analysis" tone="purple" size="xs" class="mod-ml">{{ t('overviewP3.health.analysis') }}</SBadge>
            <SBadge v-if="!channelOf(row.id)?.enabled" tone="gray" size="xs" class="mod-ml">{{ t('disabled') }}</SBadge>
          </template>
        </template>
        <template #cell-calls="{ row }"><span class="mod-num">{{ n(row.calls) }}</span></template>
        <template #cell-error="{ row }">
          <SBadge v-if="red(row)" tone="danger" size="xs" class="mod-num">{{ pct(row.error_rate) }}</SBadge>
          <span v-else class="mod-num">{{ pct(row.error_rate) }}</span>
        </template>
      </STable>

      <div>
        <SSectionTitle tag="p">
          {{ t('overviewP3.queue.title') }}
          <SHint inline size="xs" class="mod-ov-title-hint">{{ t('overviewP3.queue.hint') }}</SHint>
        </SSectionTitle>
        <QueueStatus />
      </div>
    </div>
  </SCard>
</template>

<style scoped>
.mod-ov-links {
  display: inline-flex;
  gap: 0.75rem;
}
.mod-ov-health {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.mod-ov-title-hint,
.mod-ov-after {
  margin-left: 0.375rem;
}
</style>
