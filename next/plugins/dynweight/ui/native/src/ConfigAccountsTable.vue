<script setup lang="ts">
import { computed } from 'vue'
import { SButton, SCard, SRowAction, STable, type TableColumn } from '@sub2api/ui'
import { useCatalog } from './catalog'
import { inheritText, overrideFields, sortedIds, sourceLayers, type Draft, type OverrideField } from './configView'
import { useDwHost, type AccountOverride } from './host'

// The account overrides, one row each. A field the account sets is in bold;
// one it leaves alone reads as the value it inherits, in grey, from its
// groups' layers (the global one without them). `accountGroups` holds the
// groups of each account as far as the core told them.
const props = defineProps<{ draft: Draft; accountGroups: Record<string, number[]>; readonly?: boolean }>()
const emit = defineEmits<{ (e: 'add'): void; (e: 'edit', id: string): void; (e: 'remove', id: string): void }>()
const t = useDwHost().t
const catalog = useCatalog()

/** The override's own value of a field, or undefined when it inherits. */
function ownText(o: AccountOverride, f: OverrideField): string | undefined {
  if (f === 'enabled') return o.enabled === undefined ? undefined : overrideFields.enabled(t, { enabled: o.enabled })
  if (f === 'exempt')
    return o.exempt_status_codes === undefined ? undefined : overrideFields.exempt(t, { exempt_status_codes: o.exempt_status_codes })
  return o.min_weight_mode === undefined
    ? undefined
    : overrideFields.floor(t, { min_weight_mode: o.min_weight_mode, min_weight: o.min_weight as number })
}

const fields: OverrideField[] = ['enabled', 'exempt', 'floor']

const rows = computed(() =>
  sortedIds(props.draft.accounts).map(id => {
    const o = props.draft.accounts[id]
    const sources = sourceLayers(props.draft, props.accountGroups[id])
    const cells = Object.fromEntries(
      fields.map(f => {
        const own = ownText(o, f)
        return [
          f,
          own === undefined ? { ...inheritText(t, sources, f, catalog.groupName), own: false } : { text: own, title: '', own: true }
        ]
      })
    )
    return { id, name: catalog.accountName(Number(id)), cells }
  })
)

const columns = computed<TableColumn[]>(() => [
  { key: 'account', label: t('cfg.accounts.col.account'), width: '14rem', mobile: 'title' },
  { key: 'enabled', label: t('cfg.accounts.col.enabled'), mobile: 'meta', mobileSpan: 2 },
  { key: 'exempt', label: t('cfg.accounts.col.exempt'), mobile: 'meta', mobileSpan: 2 },
  { key: 'floor', label: t('cfg.accounts.col.floor'), mobile: 'meta', mobileSpan: 2 },
  { key: 'actions', label: '', width: '7rem', align: 'right' }
])
</script>

<template>
  <SCard :title="t('cfg.accounts.title')" :subtitle="t('cfg.accounts.hint')" :padded="false" class="dw-block">
    <template v-if="!readonly" #actions>
      <SButton size="sm" icon="plus" @click="emit('add')">{{ t('cfg.accounts.add') }}</SButton>
    </template>
    <STable :columns="columns" :rows="rows" row-key="id" dense :empty-text="t('cfg.accounts.empty')">
      <template #cell-account="{ row }">{{ row.name }}</template>
      <template v-for="f in fields" :key="f" #[`cell-${f}`]="{ row }">
        <span :class="row.cells[f].own ? 'dw-cfg-own' : 'dw-cfg-muted'" :title="row.cells[f].title || undefined">{{
          row.cells[f].text
        }}</span>
      </template>
      <template #cell-actions="{ row }">
        <div class="dw-cfg-row-actions">
          <SRowAction
            :icon="readonly ? 'eye' : 'edit'"
            :label="t(readonly ? 'cfg.accounts.view' : 'cfg.accounts.edit')"
            @click="emit('edit', row.id)"
          />
          <SRowAction v-if="!readonly" icon="trash" tone="danger" :label="t('cfg.accounts.remove')" @click="emit('remove', row.id)" />
        </div>
      </template>
    </STable>
  </SCard>
</template>
