<script setup lang="ts">
// Bulk edit of the selected accounts' core properties: each field applies
// only when ticked (editing a field ticks it), everything else stays as it
// is. Groups replace, add to or remove from each account's own groups. One
// PATCH /accounts/:id per account (the same checks, plugin hooks and audit as
// a single edit), a few at a time; a stop keeps the rest unchanged. Failures
// stay listed in the dialog; the saved rows are reported through `saved`.
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SCheckbox, SHint, SInput, SModal, SProgress, SSegmented, SSwitch, toast } from '@sub2api/ui'
import type { Account, AccountType } from '@/api/types'
import GroupPicker from '@/components/GroupPicker.vue'
import ProxyPicker from '@/components/ProxyPicker.vue'
import { useBulkRun, type BulkFailure } from '@/composables/useBulkRun'
import { errorMessage } from '@/utils/errors'
import { accountControl } from './accountTypeChoices'
import { buildBulkPatch, BULK_LIMITS, type BulkFields, type GroupMode } from './bulkEdit'

const props = defineProps<{ open: boolean; accounts: Account[]; typeOf: (a: Account) => AccountType | undefined }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'saved', rows: Account[]): void }>()
const { t } = useI18n()

const on = reactive({ priority: false, weight: false, max_concurrency: false, tpm_limit: false, rpm_limit: false, spm_limit: false, groups: false, proxy: false, auto_disable: false })
const values = reactive<BulkFields>({ priority: 10, weight: 1, max_concurrency: 10, tpm_limit: 0, rpm_limit: 0, spm_limit: 0, group_ids: [], groupMode: 'replace', proxy_id: null, auto_disable: true })
const failures = ref<BulkFailure<Account>[]>([])
const bulk = useBulkRun(4)

watch(() => props.open, (open) => {
  if (!open) return
  Object.keys(on).forEach((k) => (on[k as keyof typeof on] = false))
  Object.assign(values, { priority: 10, weight: 1, max_concurrency: 10, tpm_limit: 0, rpm_limit: 0, spm_limit: 0, group_ids: [], groupMode: 'replace', proxy_id: null, auto_disable: true })
  failures.value = []
})

/** Editing a field ticks it. */
function set<K extends keyof BulkFields>(key: K, v: BulkFields[K], flag: keyof typeof on) {
  values[key] = v
  on[flag] = true
}

const numberFields = computed(() => [
  { key: 'priority' as const, label: t('accounts.priority'), hint: t('accounts.priorityHint') },
  { key: 'weight' as const, label: t('accounts.weight'), hint: t('accounts.bulk.weightHint') },
  { key: 'max_concurrency' as const, label: t('accounts.concurrency'), hint: t('accounts.bulk.zeroUnlimited') },
  { key: 'rpm_limit' as const, label: t('accounts.rpmLimit'), hint: t('accounts.bulk.zeroUnlimited') },
  { key: 'tpm_limit' as const, label: t('accounts.tpmLimit'), hint: t('accounts.bulk.zeroUnlimited') },
  { key: 'spm_limit' as const, label: t('accounts.spmLimit'), hint: t('accounts.bulk.zeroUnlimited') }
])
const invalid = computed(() => numberFields.value.filter((f) => {
  if (!on[f.key]) return false
  const v = Number(values[f.key])
  const [min, max] = BULK_LIMITS[f.key]
  return values[f.key] === null || !Number.isInteger(v) || v < min || v > max
}).map((f) => f.key))
const groupModes = computed(() => (['replace', 'add', 'remove'] as GroupMode[]).map((m) => ({ value: m, label: t(`accounts.bulk.groupMode.${m}`) })))
const anyOn = computed(() => Object.values(on).some(Boolean))
// auto_disable is skipped for account types that fix it.
const autoDisableFixed = computed(() => props.accounts.filter((a) => !accountControl(props.typeOf(a), 'auto_disable').configurable).length)

async function apply() {
  if (!anyOn.value || invalid.value.length || bulk.running.value) return
  failures.value = []
  const saved: Account[] = []
  let unchanged = 0
  const out = await bulk.run(props.accounts, async (a, signal) => {
    const body = buildBulkPatch(a, values, { ...on, auto_disable: on.auto_disable && accountControl(props.typeOf(a), 'auto_disable').configurable })
    if (!body) {
      unchanged++
      return
    }
    saved.push(await api.patch<Account>(`/accounts/${a.id}`, body, { signal }))
  })
  failures.value = out.failed
  if (saved.length) emit('saved', saved)
  const params = { ok: saved.length, fail: out.failed.length, skipped: out.skipped + unchanged }
  if (!out.failed.length && !out.skipped) {
    toast(t('accounts.bulk.editDone', params), 'success')
    emit('update:open', false)
  } else {
    toast(t('accounts.bulk.editPartial', params), 'warning')
  }
}
</script>

<template>
  <SModal :open="open" :title="t('accounts.bulk.editTitle', { n: accounts.length })" width="lg" :persistent="bulk.running.value" :closable="!bulk.running.value" @update:open="(v) => emit('update:open', v)">
    <div class="space-y-4">
      <SHint>{{ t('accounts.bulk.editInfo', { n: accounts.length }) }}</SHint>
      <fieldset class="grid gap-x-4 gap-y-3 sm:grid-cols-2" :disabled="bulk.running.value">
        <div v-for="f in numberFields" :key="f.key" class="space-y-1" :data-testid="`bulk-field-${f.key}`">
          <SCheckbox v-model="on[f.key]" size="sm">{{ f.label }}</SCheckbox>
          <SInput type="number" :model-value="values[f.key]" :min="BULK_LIMITS[f.key][0]" :max="BULK_LIMITS[f.key][1]" :aria-label="f.label" :class="on[f.key] ? '' : 'opacity-60'" :error="invalid.includes(f.key)" @update:model-value="set(f.key, $event as number | null, f.key)" />
          <SHint size="xs">{{ f.hint }}</SHint>
        </div>
        <div class="space-y-1" data-testid="bulk-field-auto_disable">
          <SCheckbox v-model="on.auto_disable" size="sm">{{ t('accounts.autoDisable') }}</SCheckbox>
          <SSwitch :model-value="values.auto_disable" :label="values.auto_disable ? t('common.yes') : t('common.no')" @update:model-value="set('auto_disable', $event, 'auto_disable')" />
          <SHint v-if="autoDisableFixed" size="xs" tone="warning">{{ t('accounts.bulk.autoDisableFixed', { n: autoDisableFixed }) }}</SHint>
        </div>
        <div class="space-y-1 sm:col-span-2" data-testid="bulk-field-groups">
          <SCheckbox v-model="on.groups" size="sm">{{ t('accounts.groups') }}</SCheckbox>
          <SSegmented :model-value="values.groupMode" :options="groupModes" size="sm" :aria-label="t('accounts.bulk.groupModeLabel')" @update:model-value="set('groupMode', $event as GroupMode, 'groups')" />
          <GroupPicker :model-value="values.group_ids" multiple @update:model-value="set('group_ids', $event as number[], 'groups')" />
          <SHint size="xs">{{ t(`accounts.bulk.groupModeHint.${values.groupMode}`) }}</SHint>
        </div>
        <div class="space-y-1 sm:col-span-2" data-testid="bulk-field-proxy">
          <SCheckbox v-model="on.proxy" size="sm">{{ t('accounts.proxy') }}</SCheckbox>
          <ProxyPicker :model-value="values.proxy_id" @update:model-value="set('proxy_id', $event, 'proxy')" />
          <SHint size="xs">{{ t('accounts.bulk.proxyHint') }}</SHint>
        </div>
      </fieldset>
      <SProgress v-if="bulk.running.value || bulk.done.value" :value="bulk.done.value" :max="bulk.total.value || 1" :label="t('accounts.bulk.progress', { done: bulk.done.value, total: bulk.total.value })" show-value />
      <div v-if="failures.length" class="rounded-lg border border-danger-200 p-3 dark:border-danger-800" data-testid="bulk-failures">
        <p class="mb-1 text-sm font-semibold text-danger-600">{{ t('accounts.bulk.failures', { n: failures.length }) }}</p>
        <ul class="max-h-40 space-y-0.5 overflow-auto text-xs">
          <li v-for="f in failures" :key="f.item.id"><span class="font-mono text-fg-subtle">#{{ f.item.id }}</span> {{ f.item.name }}：<span class="text-danger-600">{{ errorMessage(f.error) }}</span></li>
        </ul>
      </div>
    </div>
    <template #footer>
      <SButton v-if="bulk.running.value" variant="danger" icon="stop" @click="bulk.stop()">{{ t('accounts.modelTest.stop') }}</SButton>
      <SButton v-else @click="emit('update:open', false)">{{ t('common.close') }}</SButton>
      <SButton variant="primary" :loading="bulk.running.value" :disabled="!anyOn || invalid.length > 0 || !accounts.length" data-testid="bulk-edit-apply" @click="apply">{{ t('accounts.bulk.apply', { n: accounts.length }) }}</SButton>
    </template>
  </SModal>
</template>
