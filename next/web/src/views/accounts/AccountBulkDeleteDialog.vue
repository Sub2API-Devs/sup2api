<script setup lang="ts">
// Deleting the selected accounts: one DELETE /accounts/:id each (a few at a
// time, stoppable). When some of their types can keep runtime resources for
// a while (lifecycle.deletion.retentionDays), "keep" applies to those and the
// rest are deleted at once. Failures stay listed; deleted ids go to `deleted`.
import { computed, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SHint, SModal, SProgress, SRadioGroup, toast } from '@sub2api/ui'
import type { Account } from '@/api/types'
import { useBulkRun, type BulkFailure } from '@/composables/useBulkRun'
import { errorMessage } from '@/utils/errors'

const props = defineProps<{ open: boolean; accounts: Account[]; retentionOf: (a: Account) => number }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'deleted', ids: number[]): void }>()
const { t } = useI18n()
const messageId = useId()

const keep = ref<'now' | 'retain'>('now')
const failures = ref<BulkFailure<Account>[]>([])
const bulk = useBulkRun(4)
const retaining = computed(() => props.accounts.filter((a) => props.retentionOf(a) > 0))
const maxDays = computed(() => Math.max(0, ...retaining.value.map(props.retentionOf)))
const choices = computed(() => [
  { value: 'now', label: t('accounts.deleteResources.now') },
  { value: 'retain', label: t('accounts.bulk.deleteRetain', { n: retaining.value.length, days: maxDays.value }) }
])
const preview = computed(() => props.accounts.slice(0, 5).map((a) => a.name).join('、'))
watch(() => props.open, (open) => {
  if (!open) return
  keep.value = 'now'
  failures.value = []
})

async function remove() {
  if (bulk.running.value || !props.accounts.length) return
  failures.value = []
  const gone: number[] = []
  const out = await bulk.run(props.accounts, async (a, signal) => {
    const query = keep.value === 'retain' && props.retentionOf(a) > 0 ? { retain_resources: 1 } : undefined
    await api.del(`/accounts/${a.id}`, query, { signal })
    gone.push(a.id)
  })
  failures.value = out.failed
  if (gone.length) emit('deleted', gone)
  const params = { ok: gone.length, fail: out.failed.length, skipped: out.skipped }
  if (!out.failed.length && !out.skipped) {
    toast(t('accounts.bulk.deleteDone', params), 'success')
    emit('update:open', false)
  } else {
    toast(t('accounts.bulk.deletePartial', params), 'warning')
  }
}
</script>

<template>
  <SModal :open="open" :title="t('accounts.bulk.deleteTitle', { n: accounts.length })" width="md" :persistent="bulk.running.value" :closable="!bulk.running.value" :describedby="messageId" @update:open="(v) => emit('update:open', v)">
    <div class="space-y-3">
      <p :id="messageId">{{ t('accounts.bulk.deleteConfirm', { n: accounts.length }) }}</p>
      <SHint size="xs" class="break-all">{{ preview }}<template v-if="accounts.length > 5"> {{ t('accounts.bulk.andMore', { n: accounts.length - 5 }) }}</template></SHint>
      <template v-if="retaining.length">
        <SRadioGroup v-model="keep" :options="choices" :disabled="bulk.running.value" :aria-label="t('accounts.deleteResources.label')" data-testid="bulk-delete-resources" />
        <SHint>{{ keep === 'retain' ? t('accounts.bulk.deleteRetainHint') : t('accounts.deleteResources.nowHint') }}</SHint>
      </template>
      <SProgress v-if="bulk.running.value || bulk.done.value" tone="danger" :value="bulk.done.value" :max="bulk.total.value || 1" :label="t('accounts.bulk.progress', { done: bulk.done.value, total: bulk.total.value })" show-value />
      <div v-if="failures.length" class="rounded-lg border border-danger-200 p-3 dark:border-danger-800" data-testid="bulk-failures">
        <p class="mb-1 text-sm font-semibold text-danger-600">{{ t('accounts.bulk.failures', { n: failures.length }) }}</p>
        <ul class="max-h-40 space-y-0.5 overflow-auto text-xs">
          <li v-for="f in failures" :key="f.item.id"><span class="font-mono text-fg-subtle">#{{ f.item.id }}</span> {{ f.item.name }}：<span class="text-danger-600">{{ errorMessage(f.error) }}</span></li>
        </ul>
      </div>
    </div>
    <template #footer>
      <SButton v-if="bulk.running.value" variant="danger" icon="stop" @click="bulk.stop()">{{ t('accounts.modelTest.stop') }}</SButton>
      <SButton v-else @click="emit('update:open', false)">{{ failures.length ? t('common.close') : t('common.cancel') }}</SButton>
      <SButton variant="danger" :loading="bulk.running.value" :disabled="!accounts.length" data-testid="bulk-delete-confirm" @click="remove">{{ t('accounts.bulk.deleteRun', { n: accounts.length }) }}</SButton>
    </template>
  </SModal>
</template>
