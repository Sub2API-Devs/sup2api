<script setup lang="ts">
import { computed } from 'vue'
import { SAlert, SBadge, SDateTime, SStatusDot, SSwitch } from '@sub2api/ui'
import { useCatalog } from './catalog'
import { fastClimb, sortedIds, type Draft } from './configView'
import { useDwHost, type Layer } from './host'
import { countItems, hasDegradeWithoutClimb } from './items'

// The strip over the config page: the master switch (the global layer's
// `enabled`), how many items, groups and accounts there are, the version
// saved and when (or that the draft has unsaved edits), and the layers that
// adjust and would never bring a weight back, or may bring it back so soon
// that a degrade is undone (labels in the strip, sentences under it).
defineProps<{ readonly?: boolean; version: number; updatedAt: number; unsaved?: boolean }>()
const draft = defineModel<Draft>({ required: true })
const t = useDwHost().t
const catalog = useCatalog()

// The layers as the warnings name them: the global one (null), then each
// group. Each is judged on its own switch, as the warnings always were: the
// global one's is the master switch; a group is still warned about while the
// master switch is off, since its items take effect as they are once it is on.
const layers = computed((): Array<[string | null, Layer]> => {
  const c = draft.value
  return [[null, c], ...sortedIds(c.groups).map((id): [string, Layer] => [catalog.groupName(Number(id)), c.groups[id]])]
})
const label = (kind: 'noClimb' | 'fastClimb', group: string | null) =>
  group === null ? t(`cfg.summary.${kind}Global`) : t(`cfg.summary.${kind}Group`, { group })

// A short label for the strip, the whole sentence with its advice below it.
const notes = computed(() =>
  layers.value.flatMap(([group, l]) => {
    const out: Array<{ label: string; text: string }> = []
    if (l.enabled && hasDegradeWithoutClimb(l.rules, l.strategies))
      out.push({ label: label('noClimb', group), text: t('cfg.summary.noClimbHint') })
    const fast = fastClimb(l)
    if (fast) {
      const text = t('cfg.summary.fastClimbHint', { quoted: t('cfg.quote', { name: fast.name }), n: fast.seconds })
      out.push({ label: label('fastClimb', group), text })
    }
    return out
  })
)
</script>

<template>
  <div>
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
      <SBadge v-for="n in notes" :key="n.label" tone="warning">{{ n.label }}</SBadge>
    </div>
    <SAlert v-if="notes.length" tone="warning" class="dw-cfg-notes">
      <ul>
        <li v-for="n in notes" :key="n.label">{{ t('cfg.summary.note', n) }}</li>
      </ul>
    </SAlert>
  </div>
</template>
