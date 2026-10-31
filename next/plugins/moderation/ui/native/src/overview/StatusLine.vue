<script setup lang="ts">
import { computed } from 'vue'
import { SBadge, SHint, SLink } from '@sub2api/ui'
import { modeTone, useModHost } from '../host'
import { groupName } from '../directory'
import { unboundGroups } from './figures'
import { useOverviewData } from './useOverview'
import { useFormat } from './format'

// One-line running state: mode, enabled flows, bound / unmoderated / stale
// groups, disabled channels and whether an analysis channel is set.
const emit = defineEmits<{ (e: 'go-tab', tab: string): void }>()
const ov = useOverviewData()
const t = useModHost().t
const { n } = useFormat()

const s = computed(() => ov.status.data.value)
const line = computed(() => s.value?.status_line)
const unbound = computed(() => unboundGroups(ov.groups.value.map((g) => g.id), line.value?.bound_groups))
const stale = computed(() => line.value?.stale_groups || [])
const names = (ids: number[]) => ids.map(groupName).join(t('overviewP3.status.sep'))
</script>

<template>
  <div v-if="s && line" class="mod-ov-status">
    <SBadge :tone="modeTone(s.mode)" dot>{{ t(`mode.${s.mode || 'off'}`) }}</SBadge>
    <span>{{ t('overviewP3.status.flows', { n: n(line.enabled_flows) }) }}</span>
    <span class="mod-ov-dot" aria-hidden="true">·</span>
    <span>{{ t('overviewP3.status.bound', { n: n(line.bound_groups.length) }) }}</span>
    <SHint v-if="unbound.length" inline size="sm" tone="warning" :title="names(unbound)">
      {{ t('overviewP3.status.unbound', { n: n(unbound.length), groups: names(unbound.slice(0, 3)) }) }}{{ unbound.length > 3 ? '…' : '' }}
    </SHint>
    <SHint v-if="stale.length" inline size="sm" tone="warning" :title="names(stale)">
      {{ t('overviewP3.status.stale', { n: n(stale.length), groups: names(stale.slice(0, 3)) }) }}{{ stale.length > 3 ? '…' : '' }}
    </SHint>
    <span class="mod-ov-dot" aria-hidden="true">·</span>
    <SHint v-if="line.disabled_channels" inline size="sm" tone="warning">{{ t('overviewP3.status.channelsDisabled', { n: n(line.disabled_channels) }) }}</SHint>
    <span v-else>{{ t('overviewP3.status.channelsOk') }}</span>
    <span class="mod-ov-dot" aria-hidden="true">·</span>
    <span v-if="line.analysis_channel">{{ t('overviewP3.status.analysisOn') }}</span>
    <SLink v-else as="button" @click="emit('go-tab', 'settings')">{{ t('overviewP3.status.analysisOff') }}</SLink>
  </div>
</template>

<style scoped>
.mod-ov-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem 0.75rem;
  margin-bottom: 1rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid rgb(var(--line));
  border-radius: 0.5rem;
  background: rgb(var(--surface-2) / 0.5);
  font-size: 0.875rem;
}
.mod-ov-dot {
  color: rgb(var(--fg-subtle));
}
</style>
