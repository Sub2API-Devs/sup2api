<script setup lang="ts">
import { computed } from 'vue'
import { SAlert, SBadge, SButton, SLink } from '@sub2api/ui'
import { useCatalog } from '../catalog'
import { canManage, modeTone, useModHost, type Status } from '../host'

// One-line running state (new-api status-line): switch, enabled flows,
// bound / unmoderated groups, disabled channels, analysis channel; plus the
// setup hint when nothing is bound or moderation is off.
const props = defineProps<{ status: Status }>()
const emit = defineEmits<{ (e: 'go-tab', tab: string): void; (e: 'go-settings'): void }>()
const t = useModHost().t
const catalog = useCatalog()

const state = computed(() => {
  if (!props.status.enabled) return { tone: 'gray' as const, key: 'off' }
  return props.status.running ? { tone: 'success' as const, key: 'running' } : { tone: 'warning' as const, key: 'stopped' }
})

const enabledFlows = computed(() => catalog.state.flows.filter((f) => f.enabled))
const disabledFlows = computed(() => catalog.state.flows.length - enabledFlows.value.length)
const bound = computed(() => new Set(enabledFlows.value.flatMap((f) => f.groups)))
/** groups of the core no enabled flow moderates; [] when groups are not readable */
const unbound = computed(() => catalog.state.groups.filter((g) => !bound.value.has(g.id)))
const channelsDown = computed(() => catalog.state.channels.filter((c) => !c.enabled).length)
const analysisConfigured = computed(() => !!props.status.runtime.analysis?.channel_configured)

const notice = computed(() => {
  if (!props.status.runtime.configured) return { tone: 'warning' as const, text: t('overview.notConfigured'), action: 'flows' }
  if (props.status.mode === 'off') return { tone: 'info' as const, text: t('overview.offHint'), action: 'settings' }
  return null
})
const act = (action: string) => (action === 'settings' ? emit('go-settings') : emit('go-tab', action))
</script>

<template>
  <div class="mod-status-line">
    <SBadge :tone="state.tone" dot>{{ t(`statusLine.${state.key}`) }}</SBadge>
    <SBadge :tone="modeTone(status.mode)">{{ t(`mode.${status.mode || 'off'}`) }}</SBadge>
    <span>
      {{ t('statusLine.flows', { n: enabledFlows.length }) }}<template v-if="disabledFlows"> · {{ t('statusLine.flowsOff', { n: disabledFlows }) }}</template>
    </span>
    <span class="mod-sub">·</span>
    <span>{{ t('statusLine.bound', { n: bound.size }) }}</span>
    <span v-if="unbound.length" class="mod-text-warning" :title="unbound.map((g) => g.name).join(', ')">
      {{ t('statusLine.unbound', { n: unbound.length, groups: unbound.slice(0, 5).map((g) => g.name).join(', ') }) }}
    </span>
    <span class="mod-sub">·</span>
    <span :class="channelsDown ? 'mod-text-warning' : ''">{{ channelsDown ? t('statusLine.channelsDown', { n: channelsDown }) : t('statusLine.channelsOk') }}</span>
    <span class="mod-sub">·</span>
    <span v-if="analysisConfigured">{{ t('statusLine.analysisOn') }}</span>
    <SLink v-else as="button" class="mod-text-warning" @click="emit('go-settings')">{{ t('statusLine.analysisOff') }}</SLink>
  </div>

  <SAlert v-if="notice" :tone="notice.tone" class="mod-block">
    {{ notice.text }}
    <template v-if="canManage()" #actions>
      <SButton :variant="notice.action === 'flows' ? 'primary' : 'secondary'" size="sm" @click="act(notice.action)">
        {{ notice.action === 'flows' ? t('tabs.flows') : t('settings') }}
      </SButton>
    </template>
  </SAlert>
</template>
