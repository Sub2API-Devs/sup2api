<script setup lang="ts">
import { computed } from 'vue'
import { SBadge, SButton, SCard, SHint, SRowAction, STable, type TableColumn } from '@sub2api/ui'
import { useCatalog } from './catalog'
import { fieldDiffs, fieldText, globalLayer, itemDiff, itemsSame, sortedIds, type Draft } from './configView'
import { describeItemSentence } from './describe'
import { useDwHost } from './host'
import { hasDegradeWithoutClimb } from './items'

// The group layers, one row each with what sets it apart from the global
// layer: each differing field with the global value beside it, then the
// items it removed, added or changed. Editing opens ConfigGroupModal.
const props = defineProps<{ draft: Draft; readonly?: boolean }>()
const emit = defineEmits<{ (e: 'add'): void; (e: 'edit', id: string): void; (e: 'remove', id: string): void }>()
const t = useDwHost().t
const catalog = useCatalog()

const quote = (names: string[]) => names.map((name) => t('cfg.quote', { name })).join(t('cfg.quoteSep'))

const rows = computed(() => {
  const c = props.draft
  const global = globalLayer(c)
  return sortedIds(c.groups).map((id) => {
    const g = c.groups[id]
    const fields = fieldDiffs(g, global).map((f) => ({
      text: t('cfg.groups.fieldDiff', { field: t(`cfg.field.short.${f}`), value: fieldText(t, g, f), global: fieldText(t, global, f) }),
      title: ''
    }))
    const d = itemDiff(g, global)
    // A changed item reads as its sentence on hover, so the row need not name what changed.
    const sentences = (names: string[]) =>
      names.map((n) => g.strategies.find((s) => s.name === n)).flatMap((s) => (s ? [describeItemSentence(s, g.rules, t)] : [])).join('\n')
    const items = itemsSame(d)
      ? [{ text: t('cfg.groups.itemsSame'), title: '' }]
      : [
          ...(d.removed.length || d.added.length ? [{ text: t('cfg.groups.itemsCount', { n: g.strategies.length, g: global.strategies.length }), title: '' }] : []),
          ...(d.removed.length ? [{ text: t('cfg.groups.removed', { names: quote(d.removed) }), title: '' }] : []),
          ...(d.added.length ? [{ text: t('cfg.groups.added', { names: quote(d.added) }), title: sentences(d.added) }] : []),
          ...(d.changed.length ? [{ text: t('cfg.groups.changed', { names: quote(d.changed) }), title: sentences(d.changed) }] : []),
          ...(d.reordered ? [{ text: t('cfg.groups.reordered'), title: '' }] : [])
        ]
    return {
      id,
      name: catalog.groupName(Number(id)),
      enabled: g.enabled,
      same: !fields.length && itemsSame(d),
      lines: [...fields, ...items],
      noClimb: g.enabled && hasDegradeWithoutClimb(g.rules, g.strategies)
    }
  })
})

const columns = computed<TableColumn[]>(() => [
  { key: 'group', label: t('cfg.groups.col.group'), width: '12rem', mobile: 'title' },
  { key: 'enabled', label: t('cfg.groups.col.enabled'), width: '6rem', mobile: 'status' },
  { key: 'diff', label: t('cfg.groups.col.diff'), mobile: 'meta', mobileSpan: 2 },
  { key: 'warn', label: t('cfg.groups.col.warn'), width: '14rem', mobile: 'status' },
  { key: 'actions', label: '', width: '7rem', align: 'right' }
])
</script>

<template>
  <SCard :title="t('cfg.groups.title')" :subtitle="t('cfg.groups.hint')" :padded="false" class="dw-block">
    <template v-if="!readonly" #actions>
      <SButton size="sm" icon="plus" @click="emit('add')">{{ t('cfg.groups.add') }}</SButton>
    </template>
    <STable :columns="columns" :rows="rows" row-key="id" dense :empty-text="t('cfg.groups.empty')">
      <template #cell-group="{ row }">
        <span>{{ row.name }}</span>
      </template>
      <template #cell-enabled="{ row }">
        <SBadge :tone="row.enabled ? 'success' : 'gray'" size="xs">{{ t(row.enabled ? 'cfg.groups.on' : 'cfg.groups.off') }}</SBadge>
      </template>
      <template #cell-diff="{ row }">
        <div v-if="row.same" class="dw-cfg-muted">{{ t('cfg.groups.same') }}</div>
        <!-- The first difference leads, the rest follow in small print. -->
        <div v-for="(line, i) in row.lines" v-else :key="line.text" :class="{ 'dw-sub': i > 0 }" :title="line.title || undefined">{{ line.text }}</div>
      </template>
      <!-- On a phone card the warning sits in the header, short, beside the switch state. -->
      <template #cell-warn="{ row, layout }">
        <SBadge v-if="row.noClimb" tone="warning" size="xs" :title="t('cfg.groups.noClimb')">
          {{ t(layout === 'card' ? 'cfg.groups.noClimbShort' : 'cfg.groups.noClimb') }}
        </SBadge>
        <SHint v-else-if="layout !== 'card'" inline>—</SHint>
      </template>
      <template #cell-actions="{ row }">
        <div class="dw-cfg-row-actions">
          <SRowAction :icon="readonly ? 'eye' : 'edit'" :label="t(readonly ? 'cfg.groups.view' : 'cfg.groups.edit')" @click="emit('edit', row.id)" />
          <SRowAction v-if="!readonly" icon="trash" tone="danger" :label="t('cfg.groups.remove')" @click="emit('remove', row.id)" />
        </div>
      </template>
    </STable>
  </SCard>
</template>
