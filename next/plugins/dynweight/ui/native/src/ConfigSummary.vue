<script setup lang="ts">
import { computed } from 'vue'
import { SBadge, SDateTime, SStatusDot, SSwitch } from '@sub2api/ui'
import { useCatalog } from './catalog'
import { fastClimb, sortedIds, type Draft } from './configView'
import { useDwHost, type Layer } from './host'
import { countItems, hasDegradeWithoutClimb } from './items'

// The strip over the config page: the master switch (the global layer's
// `enabled`), how many items, groups and accounts there are, the version
// saved and when (or that the draft has unsaved edits), and the layers that
// adjust and would never bring a weight back, or bring it back so soon that
// a degrade barely holds.
defineProps<{ readonly?: boolean; version: number; updatedAt: number; unsaved?: boolean }>()
const draft = defineModel<Draft>({ required: true })
const t = useDwHost().t
const catalog = useCatalog()

const noClimb = computed(() => {
  const c = draft.value
  const out: string[] = []
  if (c.enabled && hasDegradeWithoutClimb(c.rules, c.strategies)) out.push(t('cfg.summary.noClimbGlobal'))
  for (const id of sortedIds(c.groups)) {
    const g = c.groups[id]
    if (g.enabled && hasDegradeWithoutClimb(g.rules, g.strategies))
      out.push(t('cfg.summary.noClimbGroup', { group: catalog.groupName(Number(id)) }))
  }
  return out
})

const tooFast = computed(() => {
  const c = draft.value
  const layers: Array<[string, Layer]> = [
    [t('cfg.summary.global'), c],
    ...sortedIds(c.groups).map((id): [string, Layer] => [catalog.groupName(Number(id)), c.groups[id]])
  ]
  return layers.flatMap(([layer, l]) => {
    const fast = fastClimb(l)
    return fast ? [t('cfg.summary.fastClimb', { layer, quoted: t('cfg.quote', { name: fast.name }), n: fast.seconds })] : []
  })
})
</script>

<template>
  <div class="dw-cfg-summary" :class="{ 'dw-cfg-summary-off': !draft.enabled }">
    <!-- SSwitch is itself the <label>: the text goes in its slot, not around it. -->
    <SSwitch
      v-model="draft.enabled"
      class="dw-cfg-summary-master"
      :disabled="readonly"
      :aria-label="t('cfg.summary.master')"
      :title="draft.enabled ? '' : t('cfg.summary.offHint')"
    >
      <strong>{{ t(draft.enabled ? 'cfg.summary.on' : 'cfg.summary.off') }}</strong>
    </SSwitch>
    <span class="dw-cfg-summary-item dw-num">{{ t('cfg.summary.items', { n: countItems(draft.strategies) }) }}</span>
    <span class="dw-cfg-summary-item dw-num">{{ t('cfg.summary.groups', { n: Object.keys(draft.groups).length }) }}</span>
    <span class="dw-cfg-summary-item dw-num">{{ t('cfg.summary.accounts', { n: Object.keys(draft.accounts).length }) }}</span>
    <span v-if="unsaved" class="dw-cfg-summary-item">
      <SStatusDot tone="warning" size="xs" class="dw-cfg-dot" />{{ t('cfg.summary.unsaved') }}
    </span>
    <span v-else-if="version > 0" class="dw-cfg-summary-item dw-num">
      {{ t('cfg.summary.saved', { n: version }) }}<template v-if="updatedAt"> · <SDateTime :value="updatedAt * 1000" /></template>
    </span>
    <span v-else class="dw-cfg-summary-item">{{ t('cfg.summary.factory') }}</span>
    <SBadge v-for="w in noClimb" :key="w" tone="warning" :title="t('cfg.summary.noClimbHint')">{{ w }}</SBadge>
    <SBadge v-for="w in tooFast" :key="w" tone="warning" :title="t('cfg.summary.fastClimbHint')">{{ w }}</SBadge>
  </div>
</template>
