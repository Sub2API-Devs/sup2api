<script setup lang="ts">
import { computed } from 'vue'
import { SAlert, SBadge, SButton, SLink } from '@sub2api/ui'
import { useCatalog } from '../catalog'
import { groupCoverage } from '../flowOps'
import { canManage, canManageSettings, modeTone, useModHost, type Status } from '../host'

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
/** moderated / unmoderated groups of the core; null when groups are not readable */
const coverage = computed(() => {
  const groups = catalog.state.groups
  if (!groups.length) return null
  const c = groupCoverage(groups.map((g) => g.id), catalog.state.flows)
  const moderated = new Set(c.moderated)
  return { moderated: moderated.size, unmoderated: groups.filter((g) => !moderated.has(g.id)).map((g) => g.name) }
})
const channelsDown = computed(() => catalog.state.channels.filter((c) => !c.enabled).length)
const analysisConfigured = computed(() => !!props.status.runtime.analysis?.channel_configured)

// Settings links only for plugin managers (core plugin:manage).
const settingsLink = computed(() => canManageSettings())
const notice = computed(() => {
  if (!props.status.runtime.configured) return { tone: 'warning' as const, text: t('overview.notConfigured'), action: canManage() ? 'flows' : '' }
  if (props.status.mode === 'off') return { tone: 'info' as const, text: t('overview.offHint'), action: settingsLink.value ? 'settings' : '' }
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
    <template v-if="coverage">
      <span class="mod-sub">·</span>
      <span>{{ t('statusLine.bound', { n: coverage.moderated }) }}</span>
      <span v-if="coverage.unmoderated.length" class="mod-text-warning" :title="coverage.unmoderated.join(', ')">
        {{ t('statusLine.unbound', { n: coverage.unmoderated.length, groups: coverage.unmoderated.slice(0, 5).join(', ') }) }}
      </span>
    </template>
    <span class="mod-sub">·</span>
    <span :class="channelsDown ? 'mod-text-warning' : ''">{{ channelsDown ? t('statusLine.channelsDown', { n: channelsDown }) : t('statusLine.channelsOk') }}</span>
    <span class="mod-sub">·</span>
    <span v-if="analysisConfigured">{{ t('statusLine.analysisOn') }}</span>
    <SLink v-else-if="settingsLink" as="button" class="mod-text-warning" @click="emit('go-settings')">{{ t('statusLine.analysisOff') }}</SLink>
    <span v-else class="mod-text-warning">{{ t('statusLine.analysisOff') }}</span>
  </div>

  <SAlert v-if="notice" :tone="notice.tone" class="mod-block">
    {{ notice.text }}
    <template v-if="notice.action" #actions>
      <SButton :variant="notice.action === 'flows' ? 'primary' : 'secondary'" size="sm" @click="act(notice.action)">
        {{ notice.action === 'flows' ? t('tabs.flows') : t('settings') }}
      </SButton>
    </template>
  </SAlert>
</template>
