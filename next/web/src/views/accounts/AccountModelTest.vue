<script setup lang="ts">
// Model test dialog of an account (after new-api's channel model test):
// candidates = the account's model list, or (all-models accounts) its mapping
// request models + the plugin default models; more can be typed in or fetched
// from the upstream. Single / selected / all tests run at most 3 at a time.
// A test is a diagnosis: it never cools down or disables the account, the
// plugin's verdict (reason / effect) is only shown.
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SButton, SCheckbox, SCode, SHint, SIcon, SInput, SLink, SModal, STable, confirm, toast, type TableColumn } from '@sub2api/ui'
import type { Account, AccountLastTest, AccountTestResult, AccountType } from '@/api/types'
import { ACCOUNT_KEYS, useOwnership } from '@/composables/useOwnership'
import { errorMessage, notifyError } from '@/utils/errors'
import { copyText } from '@/utils/format'
import { runPool } from './pool'
import { LATENCY_CLASS, TEST_CONCURRENCY, candidateModels, formatLatency, lastTestOf, latencyLevel, mergeCandidates, prettyBody, summarize, withoutModels, type Candidate, type CandidateSource, type TestRow } from './accountTest'

const props = defineProps<{ open: boolean; account: Account | null; accountType?: AccountType | null }>()
const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  /** A test finished: the account's new last_test. */
  (e: 'tested', id: number, last: AccountLastTest): void
  /** The account was saved (failed models removed). */
  (e: 'updated', a: Account): void
}>()
const { t } = useI18n()
const own = useOwnership()

/** A complete model id (CONTRACTS §16): no wildcards. */
const MODEL_RE = /^[A-Za-z0-9._:/@+-]{1,200}$/

const rows = ref<TestRow[]>([])
/** The "plugin default model" probe (no model sent), pinned above the list once run. */
const probe = ref<TestRow | null>(null)
const selected = reactive(new Set<string>())
const search = ref('')
const custom = ref('')
const customError = ref('')
const fetching = ref(false)
const running = ref(false)
let ctrl: AbortController | null = null

const canFetch = computed(() => !!props.account && !props.account.orphaned && own.can(props.account, ACCOUNT_KEYS.test))
const canUpdate = computed(() => !!props.account && !props.account.orphaned && own.can(props.account, ACCOUNT_KEYS.update))

function load() {
  stop()
  const a = props.account
  rows.value = a ? candidateModels(a, props.accountType).map((c) => ({ ...c, state: 'idle' as const })) : []
  probe.value = null
  selected.clear()
  search.value = ''
  custom.value = ''
  customError.value = ''
}
watch(() => [props.open, props.account?.id] as const, ([open], prev) => {
  if (open && (!prev?.[0] || prev[1] !== props.account?.id)) load()
  if (!open) stop()
})

const visible = computed(() => {
  const q = search.value.trim().toLowerCase()
  return q ? rows.value.filter((r) => r.model.toLowerCase().includes(q)) : rows.value
})
const tableRows = computed(() => (probe.value ? [probe.value, ...visible.value] : visible.value))
const sum = computed(() => summarize(rows.value))
const okModels = computed(() => rows.value.filter((r) => r.state === 'ok').map((r) => r.model))
const failedModels = computed(() => rows.value.filter((r) => r.state === 'fail').map((r) => r.model))
/** Failed models that are on the account's list (only those can be removed). */
const removable = computed(() => failedModels.value.filter((m) => props.account?.models?.includes(m)))
const allVisibleSelected = computed(() => visible.value.length > 0 && visible.value.every((r) => selected.has(r.model)))
const someVisibleSelected = computed(() => !allVisibleSelected.value && visible.value.some((r) => selected.has(r.model)))

const columns = computed<TableColumn[]>(() => [
  { key: 'select', label: '', width: '2rem' },
  { key: 'model', label: t('accounts.modelTest.model') },
  { key: 'state', label: t('common.status') },
  { key: 'latency', label: t('accounts.latency'), align: 'right' },
  { key: 'http', label: 'HTTP', align: 'right' },
  { key: 'detail', label: t('accounts.modelTest.detail') },
  { key: 'actions', label: '', align: 'right' }
])

function toggle(model: string, v: boolean) {
  if (v) selected.add(model)
  else selected.delete(model)
}
function selectVisible(v: boolean) {
  for (const r of visible.value) toggle(r.model, v)
}
function selectFailed() {
  selected.clear()
  for (const m of failedModels.value) selected.add(m)
}

async function testRow(row: TestRow) {
  const a = props.account
  if (!a) return
  row.state = 'testing'
  row.result = undefined
  row.error = undefined
  try {
    const r = await api.post<AccountTestResult>(`/accounts/${a.id}/test`, row.model ? { model: row.model } : {}, { signal: AbortSignal.timeout(120000) })
    row.result = r
    row.state = r.ok ? 'ok' : 'fail'
    emit('tested', a.id, lastTestOf(r, row.model))
  } catch (e) {
    row.state = 'fail'
    row.error = errorMessage(e)
  }
}

async function runMany(list: TestRow[]) {
  if (running.value || !list.length) return
  running.value = true
  ctrl = new AbortController()
  try {
    await runPool(list, TEST_CONCURRENCY, (r) => testRow(r), ctrl.signal)
  } finally {
    running.value = false
    ctrl = null
  }
  const s = summarize(list)
  toast(t('accounts.modelTest.doneToast', { ok: s.ok, fail: s.fail }), s.fail ? 'warning' : 'success')
}
const testAll = () => runMany(visible.value)
const testSelected = () => runMany(rows.value.filter((r) => selected.has(r.model)))
function stop() {
  ctrl?.abort()
}

function testProbe() {
  if (!probe.value) probe.value = { model: '', source: 'default', state: 'idle' }
  void testRow(probe.value)
}

function addRows(models: string[], source: CandidateSource): number {
  const merged = mergeCandidates(rows.value, models, source)
  const known = new Set(rows.value.map((r) => r.model))
  rows.value = merged.list.map((c: Candidate) => (known.has(c.model) ? rows.value.find((r) => r.model === c.model)! : { ...c, state: 'idle' as const }))
  return merged.added
}

function addCustom() {
  const parts = custom.value.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)
  const bad = parts.find((p) => !MODEL_RE.test(p) || p.includes('*'))
  if (bad) {
    customError.value = t('accounts.modelInvalid', { model: bad })
    return
  }
  customError.value = ''
  if (!parts.length) return
  addRows(parts, 'custom')
  for (const p of parts) selected.add(p)
  custom.value = ''
}

async function fetchUpstream() {
  const a = props.account
  if (!a || fetching.value) return
  fetching.value = true
  try {
    const r = await api.post<{ models: string[]; skipped: number }>(`/accounts/${a.id}/models/fetch`, {})
    const added = addRows(r.models || [], 'upstream')
    toast(added ? t('accounts.modelTest.fetchAdded', { n: added }) : t('accounts.modelTest.fetchNothing'), added ? 'success' : 'info')
  } catch (e) {
    notifyError(e)
  } finally {
    fetching.value = false
  }
}

async function copyList(list: string[]) {
  if (list.length && (await copyText(list.join(',')))) toast(t('accounts.editorUi.copied', { n: list.length }), 'success')
}

async function removeFailed() {
  const a = props.account
  if (!a || !removable.value.length) return
  const next = withoutModels(a.models || [], removable.value)
  if (!next) return
  // An empty list means "every model": refusing beats silently widening the account.
  if (!next.length) {
    toast(t('accounts.modelTest.removeAllRefused'), 'warning')
    return
  }
  const ok = await confirm({
    title: t('accounts.modelTest.removeTitle'),
    message: t('accounts.modelTest.removeConfirm', { n: removable.value.length, models: removable.value.join(', '), left: next.length }),
    confirmText: t('accounts.modelTest.removeFailed', { n: removable.value.length }),
    danger: true
  })
  if (!ok) return
  try {
    const saved = await api.patch<Account>(`/accounts/${a.id}`, { models: next })
    const drop = new Set(removable.value)
    rows.value = rows.value.filter((r) => !drop.has(r.model))
    for (const m of drop) selected.delete(m)
    toast(t('accounts.modelTest.removed', { n: drop.size }), 'success')
    emit('updated', saved)
  } catch (e) {
    notifyError(e)
  }
}

function close() {
  stop()
  emit('update:open', false)
}

function sourceLabel(s: CandidateSource) {
  return t(`accounts.modelTest.source.${s}`)
}
function stateBadge(r: TestRow): { tone: 'gray' | 'info' | 'success' | 'danger'; label: string } {
  if (r.state === 'testing') return { tone: 'info', label: t('accounts.modelTest.state.testing') }
  if (r.state === 'ok') return { tone: 'success', label: t('accounts.modelTest.state.ok') }
  if (r.state === 'fail') return { tone: 'danger', label: t('accounts.modelTest.state.fail') }
  return { tone: 'gray', label: t('accounts.modelTest.state.idle') }
}
function effectBadge(e?: string): { tone: 'warning' | 'danger'; label: string } | null {
  if (!e) return null
  if (e === 'cooldown') return { tone: 'warning', label: t('accounts.testEffect.cooldown') }
  if (e === 'disable') return { tone: 'danger', label: t('accounts.testEffect.disable') }
  return { tone: 'warning', label: e }
}
function usageText(r?: AccountTestResult): string {
  const u = r?.usage
  if (!u) return ''
  const parts: string[] = []
  const pairs = [
    ['testUsageInput', u.input_tokens],
    ['testUsageOutput', u.output_tokens],
    ['testUsageCacheRead', u.cache_read_tokens],
    ['testUsageCacheWrite', u.cache_creation_tokens]
  ] as const
  for (const [key, v] of pairs) if (v != null) parts.push(`${t(`accounts.${key}`)} ${v}`)
  return parts.join(' · ')
}
/** The model that went upstream when the mapping / plugin changed it. */
function actualModel(r: TestRow): string {
  const m = r.result?.model
  return m && m !== r.model ? m : ''
}
async function copyBody(r: TestRow) {
  const b = prettyBody(r.result?.body)
  if (b && (await copyText(b))) toast(t('common.copied'), 'success')
}
</script>

<template>
  <SModal :open="open" :title="`${t('accounts.modelTest.title')} · ${account?.name || ''}`" width="2xl" @update:open="(v) => (v ? emit('update:open', true) : close())">
    <div v-if="account" class="space-y-3" data-testid="model-test">
      <!-- summary -->
      <div class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-gray-100 bg-gray-50/60 px-3.5 py-2.5 text-sm dark:border-dark-700 dark:bg-dark-900/30" data-testid="model-test-summary">
        <span class="text-gray-600 dark:text-dark-300">{{ t('accounts.modelTest.total', { n: sum.total }) }}</span>
        <SBadge tone="success" dot>{{ t('accounts.modelTest.okCount', { n: sum.ok }) }}</SBadge>
        <SBadge tone="danger" dot>{{ t('accounts.modelTest.failCount', { n: sum.fail }) }}</SBadge>
        <SBadge v-if="sum.testing" tone="info" dot>{{ t('accounts.modelTest.testingCount', { n: sum.testing }) }}</SBadge>
        <span class="ml-auto flex flex-wrap items-center gap-1.5">
          <SButton size="sm" variant="ghost" :disabled="!okModels.length" data-testid="model-test-copy-ok" @click="copyList(okModels)"><SIcon name="copy" class="h-3.5 w-3.5" />{{ t('accounts.modelTest.copyOk') }}</SButton>
          <SButton size="sm" variant="ghost" :disabled="!failedModels.length" data-testid="model-test-copy-fail" @click="copyList(failedModels)"><SIcon name="copy" class="h-3.5 w-3.5" />{{ t('accounts.modelTest.copyFail') }}</SButton>
          <SButton v-if="canUpdate && removable.length" size="sm" variant="danger" :disabled="running" data-testid="model-test-remove-failed" @click="removeFailed">
            <SIcon name="trash" class="h-3.5 w-3.5" />{{ t('accounts.modelTest.removeFailed', { n: removable.length }) }}
          </SButton>
        </span>
      </div>
      <SHint size="xs">{{ t('accounts.modelTest.diagnosisOnly') }}</SHint>

      <!-- toolbar -->
      <div class="flex flex-wrap items-start gap-2">
        <div class="relative min-w-[12rem] flex-1">
          <SIcon name="search" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <SInput v-model="search" class="!pl-9" :placeholder="t('accounts.modelTest.search')" :aria-label="t('accounts.modelTest.search')" />
        </div>
        <form class="flex min-w-[14rem] flex-1 flex-col gap-1" @submit.prevent="addCustom">
          <div class="flex gap-2">
            <SInput v-model="custom" mono :error="!!customError" :placeholder="t('accounts.modelTest.customPlaceholder')" data-testid="model-test-custom" />
            <SButton type="submit" :disabled="!custom.trim()"><SIcon name="plus" class="h-4 w-4" />{{ t('accounts.modelTest.add') }}</SButton>
          </div>
          <p v-if="customError" class="input-error-text !mt-0">{{ customError }}</p>
        </form>
        <SButton v-if="canFetch" :loading="fetching" :title="t('accounts.modelTest.fetchHint')" data-testid="model-test-fetch" @click="fetchUpstream">
          <SIcon v-if="!fetching" name="download" class="h-4 w-4" />{{ t('accounts.modelTest.fetch') }}
        </SButton>
        <SButton :loading="probe?.state === 'testing'" :title="t('accounts.modelTest.probeHint')" data-testid="model-test-probe" @click="testProbe">
          <SIcon v-if="probe?.state !== 'testing'" name="bolt" class="h-4 w-4" />{{ t('accounts.modelTest.probe') }}
        </SButton>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-dark-400">
        <SCheckbox size="xs" :model-value="allVisibleSelected" :indeterminate="someVisibleSelected" :disabled="!visible.length" data-testid="model-test-select-all" @update:model-value="selectVisible">
          {{ t('accounts.modelTest.selectVisible', { n: visible.length }) }}
        </SCheckbox>
        <span class="flex items-center gap-3">
          <SLink v-if="failedModels.length" as="button" class="text-xs" @click="selectFailed">{{ t('accounts.modelTest.selectFailed') }}</SLink>
          <span>{{ t('accounts.modelTest.selected', { n: selected.size }) }}</span>
        </span>
      </div>

      <SHint v-if="!rows.length" tone="warning">{{ t('accounts.modelTest.noCandidates') }}</SHint>
      <STable v-else-if="tableRows.length" :columns="columns" :rows="tableRows" row-key="model" expandable dense data-testid="model-test-table">
        <template #cell-select="{ row }">
          <SCheckbox v-if="row.model" bare :model-value="selected.has(row.model)" :aria-label="row.model" @update:model-value="toggle(row.model, $event)" />
        </template>
        <template #cell-model="{ row }">
          <div class="flex min-w-0 max-w-[18rem] flex-wrap items-center gap-1.5">
            <span v-if="row.model" class="truncate font-mono text-xs" :title="row.model">{{ row.model }}</span>
            <span v-else class="text-xs font-medium">{{ t('accounts.modelTest.probeRow') }}</span>
            <span v-if="row.model && row.source !== 'account'" class="rounded bg-gray-100 px-1 text-[10px] text-gray-500 dark:bg-dark-700 dark:text-dark-300">{{ sourceLabel(row.source) }}</span>
          </div>
          <div v-if="actualModel(row) || (!row.model && row.result?.model)" class="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-violet-600 dark:text-violet-300" :title="t('accounts.testActualModel')">
            <SIcon name="chevron-right" class="h-3 w-3" />{{ actualModel(row) || row.result?.model }}
          </div>
        </template>
        <template #cell-state="{ row }">
          <SBadge :tone="stateBadge(row).tone" dot>{{ stateBadge(row).label }}</SBadge>
        </template>
        <template #cell-latency="{ row }">
          <span v-if="row.result" class="font-mono text-xs tabular-nums" :class="LATENCY_CLASS[latencyLevel(row.result.latency_ms)]">{{ formatLatency(row.result.latency_ms) }}</span>
          <span v-else class="text-xs text-gray-300">—</span>
        </template>
        <template #cell-http="{ row }">
          <span v-if="row.result?.status" class="font-mono text-xs tabular-nums" :class="row.result.status >= 400 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-dark-300'">{{ row.result.status }}</span>
          <span v-else class="text-xs text-gray-300">—</span>
        </template>
        <template #cell-detail="{ row }">
          <div class="max-w-[22rem] space-y-0.5 text-xs">
            <div v-if="row.error" class="line-clamp-2 break-all text-red-600 dark:text-red-400" :title="row.error">{{ row.error }}</div>
            <div v-else-if="row.result && !row.result.ok && (row.result.reason || row.result.message)" class="line-clamp-2 break-all text-red-600 dark:text-red-400" :title="row.result.message">
              {{ row.result.reason || row.result.message }}
            </div>
            <div v-else-if="row.result?.message" class="line-clamp-1 break-all text-gray-500 dark:text-dark-400" :title="row.result.message">{{ row.result.message }}</div>
            <SBadge v-if="effectBadge(row.result?.effect)" :tone="effectBadge(row.result?.effect)!.tone" :title="t('accounts.testEffectNotApplied')">{{ effectBadge(row.result?.effect)!.label }}</SBadge>
          </div>
        </template>
        <template #cell-actions="{ row }">
          <SButton size="sm" variant="ghost" :loading="row.state === 'testing'" :disabled="running && row.state !== 'testing'" data-testid="model-test-one" @click="testRow(row)">{{ t('common.test') }}</SButton>
        </template>
        <template #expand="{ row }">
          <div class="space-y-3 px-2 py-2 text-xs">
            <SHint v-if="!row.result && !row.error" size="xs">{{ t('accounts.modelTest.notRun') }}</SHint>
            <dl v-if="row.result" class="kv">
              <template v-if="row.result.requested_model">
                <dt>{{ t('accounts.modelTest.requested') }}</dt>
                <dd class="font-mono">{{ row.result.requested_model }}</dd>
              </template>
              <template v-if="row.result.model">
                <dt>{{ t('accounts.testActualModel') }}</dt>
                <dd class="font-mono">{{ row.result.model }}</dd>
              </template>
              <template v-if="row.result.upstream">
                <dt>{{ t('accounts.testUpstream') }}</dt>
                <dd class="break-all font-mono">{{ row.result.upstream }}</dd>
              </template>
              <template v-if="usageText(row.result)">
                <dt>{{ t('accounts.testUsage') }}</dt>
                <dd class="tabular-nums">{{ usageText(row.result) }}</dd>
              </template>
              <template v-if="row.result.message">
                <dt>{{ t('accounts.message') }}</dt>
                <dd class="break-all">{{ row.result.message }}</dd>
              </template>
              <template v-if="row.result.reason">
                <dt>{{ t('accounts.testReason') }}</dt>
                <dd class="break-all">{{ row.result.reason }}</dd>
              </template>
              <template v-if="effectBadge(row.result.effect)">
                <dt>{{ t('accounts.testEffectTitle') }}</dt>
                <dd>
                  <SBadge :tone="effectBadge(row.result.effect)!.tone">{{ effectBadge(row.result.effect)!.label }}</SBadge>
                  <SHint inline size="xs" class="ml-2">{{ t('accounts.testEffectNotApplied') }}</SHint>
                </dd>
              </template>
            </dl>
            <div v-if="row.result?.body">
              <div class="mb-1 flex items-center justify-between">
                <span class="font-medium text-gray-700 dark:text-gray-200">{{ t('accounts.testBody') }}</span>
                <SButton size="sm" variant="ghost" @click="copyBody(row)"><SIcon name="copy" class="h-3.5 w-3.5" />{{ t('common.copy') }}</SButton>
              </div>
              <SCode class="max-h-64 overflow-y-auto">{{ prettyBody(row.result.body) }}</SCode>
            </div>
            <SHint v-else-if="row.result" size="xs">{{ t('accounts.testBodyEmpty') }}</SHint>
          </div>
        </template>
      </STable>
      <SHint v-else size="xs">{{ t('accounts.modelTest.noMatch') }}</SHint>
    </div>
    <template #footer>
      <SButton v-if="running" variant="danger" data-testid="model-test-stop" @click="stop"><SIcon name="stop" class="h-4 w-4" />{{ t('accounts.modelTest.stop') }}</SButton>
      <SButton @click="close">{{ t('common.close') }}</SButton>
      <SButton :disabled="!selected.size || running" data-testid="model-test-selected" @click="testSelected">{{ t('accounts.modelTest.testSelected', { n: selected.size }) }}</SButton>
      <SButton variant="primary" :loading="running" :disabled="!visible.length || running" data-testid="model-test-all" @click="testAll">{{ t('accounts.modelTest.testAll', { n: visible.length }) }}</SButton>
    </template>
  </SModal>
</template>
