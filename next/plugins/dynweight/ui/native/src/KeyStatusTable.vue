<script setup lang="ts">
import { computed } from 'vue'
import type { UseListResult } from '@sub2api/host'
import { SBadge, SButton, SCard, SHint, SPagination, STable, type TableColumn } from '@sub2api/ui'
import KeyDetail from './KeyDetail.vue'
import { useCatalog } from './catalog'
import { canManage, keyOf, successRate, useDwHost, weightOf, weightTone, type KeyStatus } from './host'

// The keys of a GET /status list with their pager: weight against base,
// last window, rules hit, expansion to the KeyDetail, and per row a reset
// (emitted, the owner confirms and reloads; `busy` is the key being reset)
// and a jump to its events. Shared by the status tab (every account,
// selectable) and the account tab (one account, no account column).
const props = defineProps<{ list: UseListResult<KeyStatus>; busy: string; selectable?: boolean; hideAccount?: boolean }>()
const emit = defineEmits<{ (e: 'reset', row: KeyStatus): void; (e: 'show-events', row: KeyStatus): void }>()
const selected = defineModel<string[]>('selected', { default: () => [] })
const host = useDwHost()
const t = host.t
const manage = computed(() => canManage())
const catalog = useCatalog()

const columns = computed<TableColumn[]>(() => [
  ...(props.hideAccount ? [] : [{ key: 'account', label: t('status.col.account'), ellipsis: '14rem' }]),
  { key: 'group_id', label: t('status.col.group'), ellipsis: '10rem' },
  { key: 'model', label: t('status.col.model'), ellipsis: '12rem' },
  { key: 'weight', label: t('status.col.weight'), nowrap: true },
  { key: 'window', label: t('status.col.window'), nowrap: true },
  { key: 'rules', label: t('status.col.rules') },
  { key: 'changed_at', label: t('status.col.changed'), nowrap: true },
  { key: 'actions', label: t('status.col.actions'), align: 'right', nowrap: true }
])

const rows = computed(() => props.list.items.value.map((r) => ({ ...r, key: keyOf(r), hits: r.rules.filter((x) => x.hit) })))
</script>

<template>
  <SCard :padded="false">
    <STable
      v-model:selected="selected"
      :columns="columns"
      :rows="rows"
      :loading="list.loading.value"
      row-key="key"
      :empty-text="t('status.empty')"
      :selectable="selectable"
      expandable
      fit-expanded-to-container
      dense
    >
      <template #cell-account="{ row }">
        <span>{{ row.account_name || catalog.accountName(row.account_id) }}</span>
        <div class="dw-sub dw-num">#{{ row.account_id }}</div>
      </template>
      <template #cell-group_id="{ row }">{{ catalog.groupName(row.group_id) }}</template>
      <template #cell-weight="{ row }">
        <SBadge v-if="row.reset" tone="gray">{{ t('status.resetBadge') }}</SBadge>
        <SBadge v-else :tone="weightTone(row.effective, row.base)">{{ weightOf(row.effective) }} / {{ row.base }}</SBadge>
        <SBadge v-if="!row.adjusting" tone="gray" size="xs" class="dw-ml">{{ t('status.paused') }}</SBadge>
        <SBadge v-else-if="row.state !== 'normal'" :tone="row.state === 'degrading' ? 'warning' : 'info'" size="xs" class="dw-ml">{{ t(`state.${row.state}`) }}</SBadge>
        <SBadge v-if="row.adjusting && row.no_climb_strategy" tone="danger" size="xs" class="dw-ml" :title="t('detail.noClimb')">!</SBadge>
      </template>
      <template #cell-window="{ row }">
        <template v-if="row.eval_window">
          <span class="dw-num">{{ t('status.windowStats', { total: row.total, fail: row.fail, rate: successRate(row.total, row.fail) }) }}</span>
          <div class="dw-sub">
            {{ row.verdict ? t(`verdict.${row.verdict}`) : '' }}
            <template v-if="row.recent.windows">· {{ t('status.recent', { n: row.recent.windows, rate: successRate(row.recent.total, row.recent.fail) }) }}</template>
          </div>
        </template>
        <template v-else>
          <SHint inline>{{ t('status.notEvaluated') }}</SHint>
          <div class="dw-sub dw-num">{{ t('status.current', { total: row.current.total, fail: row.current.fail }) }}</div>
        </template>
      </template>
      <template #cell-rules="{ row }">
        <div class="dw-chips">
          <SBadge v-for="r in row.hits" :key="r.name" :tone="r.fired ? 'danger' : 'warning'" size="xs" :title="t('status.ruleSamples', { n: r.samples, lookback: r.lookback })">
            {{ r.name }}
          </SBadge>
          <SHint v-if="!row.hits.length" inline>—</SHint>
        </div>
      </template>
      <template #cell-changed_at="{ row }">{{ row.changed_at ? host.i18n.formatDateTime(row.changed_at * 1000) : '—' }}</template>
      <template #cell-actions="{ row }">
        <SButton size="sm" variant="ghost" @click="emit('show-events', row)">{{ t('status.events') }}</SButton>
        <SButton v-if="manage && !row.reset" size="sm" :loading="busy === row.key" @click="emit('reset', row)">{{ t('status.reset') }}</SButton>
      </template>
      <template #expand="{ row }">
        <KeyDetail :row="row" />
      </template>
    </STable>
    <div class="dw-pager">
      <SPagination v-model:page="list.page.value" v-model:page-size="list.pageSize.value" :total="list.total.value" />
    </div>
  </SCard>
</template>
