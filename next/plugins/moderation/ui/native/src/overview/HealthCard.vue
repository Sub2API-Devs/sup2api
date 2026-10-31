<script setup lang="ts">
import { computed } from 'vue'
import { SBadge, SCard, SLink, STable, type TableColumn } from '@sub2api/ui'
import EnabledBadge from '../EnabledBadge.vue'
import RateCell from '../RateCell.vue'
import { useCatalog } from '../catalog'
import { enumLabel, num } from '../format'
import { useModHost } from '../host'
import type { Status, TabKey } from '../types'

// Channels · auditors in the last hour (new-api health-card): calls, hit and
// error rate (red when flagged or above the alert threshold). Failed calls
// pass as moderation errors without retry.
const props = defineProps<{ status: Status }>()
const emit = defineEmits<{ (e: 'go-tab', tab: TabKey): void }>()
const t = useModHost().t
const catalog = useCatalog()
const alert = computed(() => props.status.error_rate_alert_percent)

// Health rows joined with the auditor / channel they describe (undefined when deleted).
const auditors = computed(() => props.status.auditors.map((h) => ({ ...h, auditor: catalog.auditor(h.id) })))
const channels = computed(() => props.status.channels.map((h) => ({ ...h, channel: catalog.channel(h.id) })))

const auditorColumns = computed<TableColumn[]>(() => [
  { key: 'name', label: t('trace.auditor') },
  { key: 'channel', label: t('auditors.col.channel') },
  { key: 'calls', label: t('health.calls'), align: 'right', nowrap: true },
  { key: 'hit_rate', label: t('stats.hitRate'), align: 'right', nowrap: true },
  { key: 'error_rate', label: t('health.errorRate'), align: 'right', nowrap: true }
])
const channelColumns = computed<TableColumn[]>(() => [
  { key: 'name', label: t('channels.col.name') },
  { key: 'calls', label: t('health.calls'), align: 'right', nowrap: true },
  { key: 'error_rate', label: t('health.errorRate'), align: 'right', nowrap: true }
])
</script>

<template>
  <SCard :title="t('health.title')" :subtitle="t('health.hint')">
    <template #actions>
      <SLink as="button" @click="emit('go-tab', 'channels')">{{ t('health.channels') }}</SLink>
      <SLink as="button" @click="emit('go-tab', 'auditors')">{{ t('health.auditors') }}</SLink>
    </template>
    <div class="mod-stack">
      <STable :columns="auditorColumns" :rows="auditors" row-key="id" dense :empty-text="t('health.noAuditors')">
        <template #cell-name="{ row }">
          {{ catalog.auditorName(row.id) }}
          <span v-if="row.auditor" class="mod-sub">{{ enumLabel('auditorType', row.auditor.type) }}</span>
        </template>
        <template #cell-channel="{ row }">
          <template v-if="row.auditor">
            {{ row.auditor.channel_name || catalog.channelName(row.auditor.channel_id) }}
            <EnabledBadge :enabled="row.auditor.channel_enabled" size="xs" class="mod-ml" />
          </template>
          <span v-else class="mod-sub">—</span>
        </template>
        <template #cell-calls="{ row }">
          <span class="mod-num">{{ num(row.calls) }}</span>
          <div v-if="row.skipped_no_text" class="mod-sub">{{ t('health.skipped', { n: num(row.skipped_no_text) }) }}</div>
        </template>
        <template #cell-hit_rate="{ row }"><RateCell :rate="row.hit_rate" /></template>
        <template #cell-error_rate="{ row }"><RateCell :rate="row.error_rate" :alert-percent="alert" :flagged="row.flagged" /></template>
      </STable>

      <STable :columns="channelColumns" :rows="channels" row-key="id" dense :empty-text="t('health.noChannels')">
        <template #cell-name="{ row }">
          {{ catalog.channelName(row.id) }}
          <template v-if="row.channel">
            <span class="mod-sub">{{ enumLabel('channelType', row.channel.type) }}</span>
            <SBadge v-if="row.channel.analysis" tone="purple" size="xs" class="mod-ml">{{ t('channels.analysis') }}</SBadge>
            <EnabledBadge v-if="!row.channel.enabled" :enabled="false" size="xs" class="mod-ml" />
          </template>
        </template>
        <template #cell-calls="{ row }"><span class="mod-num">{{ num(row.calls) }}</span></template>
        <template #cell-error_rate="{ row }"><RateCell :rate="row.error_rate" :alert-percent="alert" :flagged="row.flagged" /></template>
      </STable>
    </div>
  </SCard>
</template>
