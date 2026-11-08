<script setup lang="ts">
import { computed } from 'vue'
import type { UseListResult } from '@sub2api/host'
import { SBadge, SCard, SDropdown, SHint, SPagination, STable, type MenuAction, type TableColumn } from '@sub2api/ui'
import KeyDetail from './KeyDetail.vue'
import { useCatalog } from './catalog'
import { canManage, keyOf, shortTime, successRate, useDwHost, weightOf, weightTone, type KeyStatus } from './host'

// The keys of a GET /status list with their pager, one line per key: the
// configuration in force, weight against base and its direction, last
// window, rules hit, last change, and a ⋯ menu with the key's events and a
// reset (emitted, the owner confirms and reloads; `busy` is the key being
// reset). A row expands to its KeyDetail. Shared by the status tab (every
// account, selectable) and the account tab (one account, no account column).
const props = defineProps<{ list: UseListResult<KeyStatus>; busy: string; selectable?: boolean; hideAccount?: boolean }>()
const emit = defineEmits<{ (e: 'reset', row: KeyStatus): void; (e: 'show-events', row: KeyStatus): void }>()
const selected = defineModel<string[]>('selected', { default: () => [] })
const host = useDwHost()
const t = host.t
const manage = computed(() => canManage())
const catalog = useCatalog()

// Phone cards: the key as title / subtitle, the weight as status. The account
// tab sits in the ~56rem account detail: narrower cells and no config column
// (its KeyDetail names the configuration), so nothing scrolls sideways.
const columns = computed<TableColumn[]>(() => {
  const narrow = props.hideAccount
  return [
    ...(narrow ? [] : [{ key: 'account', label: t('status.col.account'), ellipsis: '12rem', mobile: 'title' as const }]),
    { key: 'group_id', label: t('status.col.group'), ellipsis: narrow ? '6rem' : '8rem', mobile: narrow ? 'title' : 'subtitle' },
    { key: 'model', label: t('status.col.model'), ellipsis: narrow ? '9rem' : '11rem', mobile: 'subtitle' },
    ...(narrow ? [] : [{ key: 'config', label: t('acct.table.config'), nowrap: true, mobile: 'meta' as const }]),
    { key: 'weight', label: t('status.col.weight'), nowrap: true, mobile: 'status' },
    { key: 'window', label: t('status.col.window'), nowrap: true, mobile: 'meta' },
    { key: 'rules', label: t('status.col.rules'), ellipsis: narrow ? '7rem' : '12rem', mobile: 'meta' },
    { key: 'changed_at', label: t('status.col.changed'), nowrap: true, mobile: 'meta' },
    { key: 'actions', label: '', align: 'right', nowrap: true }
  ]
})

const rows = computed(() => props.list.items.value.map((r) => ({ ...r, key: keyOf(r), hits: r.rules.filter((x) => x.hit) })))

const menu = (r: KeyStatus): MenuAction[] => [
  { key: 'events', label: t('status.events'), icon: 'chart' },
  { key: 'reset', label: t('status.reset'), icon: 'refresh', danger: true, hidden: !manage.value || r.reset, disabled: !!props.busy }
]
const pick = (r: KeyStatus, action: string) => (action === 'reset' ? emit('reset', r) : emit('show-events', r))
</script>

<template>
  <SCard :padded="false">
    <STable v-model:selected="selected" :columns="columns" :rows="rows" :loading="list.loading.value" row-key="key" :empty-text="t('status.empty')" :selectable="selectable" expandable fit-expanded-to-container dense>
      <template #cell-account="{ row }">
        {{ row.account_name || catalog.accountName(row.account_id) }}
        <span class="dw-acct-id dw-num">#{{ row.account_id }}</span>
      </template>
      <template #cell-group_id="{ row }">{{ catalog.groupName(row.group_id) }}</template>
      <template #cell-model="{ row }"
        ><span class="dw-acct-mono" :title="row.model">{{ row.model }}</span></template
      >
      <template #cell-config="{ row }">
        <span class="dw-acct-muted">{{ t(row.group_configured ? 'acct.table.group' : 'acct.table.global') }}</span>
      </template>
      <template #cell-weight="{ row }">
        <SBadge v-if="row.reset" tone="gray" size="xs">{{ t('status.resetBadge') }}</SBadge>
        <SBadge v-else :tone="weightTone(row.effective, row.base)" size="xs" class="dw-num">{{ weightOf(row.effective) }} / {{ row.base }}</SBadge>
        <SBadge v-if="!row.adjusting" tone="gray" size="xs" class="dw-ml">{{ t('status.paused') }}</SBadge>
        <span v-else-if="row.state !== 'normal'" :class="`dw-acct-${row.state}`" class="dw-acct-arrow" :title="t(`acct.table.stateAria.${row.state}`)" :aria-label="t(`acct.table.stateAria.${row.state}`)">
          {{ row.state === 'degrading' ? '▼' : '▲' }}
        </span>
        <SBadge v-if="row.adjusting && row.no_climb_strategy" tone="danger" size="xs" class="dw-ml" :title="t('acct.detail.noClimb')">!</SBadge>
      </template>
      <template #cell-window="{ row }">
        <span v-if="row.eval_window" class="dw-num" :title="t('status.windowStats', { total: row.total, fail: row.fail, rate: successRate(row.total, row.fail) })">
          {{ t('acct.table.window', { rate: successRate(row.total, row.fail), n: row.total }) }}
        </span>
        <SHint v-else inline>{{ t('acct.table.notEvaluated', { n: row.current.total }) }}</SHint>
      </template>
      <template #cell-rules="{ row }">
        <span class="dw-acct-chips">
          <SBadge v-for="r in row.hits" :key="r.name" :tone="r.fired ? 'danger' : 'warning'" size="xs" :title="t('status.ruleSamples', { n: r.samples, lookback: r.lookback })">
            {{ r.name }}
          </SBadge>
          <SHint v-if="!row.hits.length" inline>—</SHint>
        </span>
      </template>
      <template #cell-changed_at="{ row }"
        ><span class="dw-num" :title="row.changed_at ? host.i18n.formatDateTime(row.changed_at * 1000) : undefined">{{ row.changed_at ? shortTime(new Date(row.changed_at * 1000)) : '—' }}</span></template
      >
      <template #cell-actions="{ row }">
        <SDropdown :actions="menu(row)" :aria-label="t('acct.table.more')" @select="pick(row, $event)" />
      </template>
      <template #expand="{ row }">
        <KeyDetail :row="row" />
      </template>
    </STable>
    <div v-if="list.total.value > list.pageSize.value" class="dw-pager">
      <SPagination v-model:page="list.page.value" v-model:page-size="list.pageSize.value" :total="list.total.value" />
    </div>
  </SCard>
</template>
