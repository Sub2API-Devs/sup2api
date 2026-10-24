<script setup lang="ts">
// Deleting an account. A type whose plugin can keep the account's runtime
// resources for a while (lifecycle.deletion.retentionDays) offers that here;
// the days come from the manifest, the core refuses any other choice. The
// dialog stays open while the request runs.
import { computed, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SButton, SHint, SModal, SRadioGroup } from '@sub2api/ui'
import type { Account } from '@/api/types'
import { deleteResource } from '@/composables/crud'

const props = defineProps<{ open: boolean; account: Account | null; retentionDays: number }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'deleted'): void }>()
const { t } = useI18n()
const messageId = useId()
const hintId = useId()

const keep = ref<'now' | 'retain'>('now')
const busy = ref(false)
const choices = computed(() => [
  { value: 'now', label: t('accounts.deleteResources.now') },
  { value: 'retain', label: t('accounts.deleteResources.retain', { days: props.retentionDays }) },
])
const describedby = computed(() => (props.retentionDays > 0 ? `${messageId} ${hintId}` : messageId))
watch(() => props.open, open => { if (open) keep.value = 'now' })

async function remove() {
  if (!props.account || busy.value) return
  busy.value = true
  try {
    const query = keep.value === 'retain' ? { retain_resources: 1 } : undefined
    // The dialog stays busy until it is closed: clearing busy first would make
    // it closable again for a tick while it is still open.
    if (!(await deleteResource(`/accounts/${props.account.id}`, query))) return
    emit('update:open', false)
    emit('deleted')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <SModal :open="open" :title="t('common.delete')" width="sm" :persistent="busy" :closable="!busy" :describedby="describedby" @update:open="v => emit('update:open', v)">
    <div class="space-y-3">
      <p :id="messageId">{{ t('common.confirmDelete', { name: account?.name ?? '' }) }}</p>
      <template v-if="retentionDays > 0">
        <SRadioGroup v-model="keep" :options="choices" :aria-label="t('accounts.deleteResources.label')" data-testid="account-delete-resources" />
        <SHint :id="hintId">{{ keep === 'retain' ? t('accounts.deleteResources.retainHint', { days: retentionDays }) : t('accounts.deleteResources.nowHint') }}</SHint>
      </template>
    </div>
    <template #footer>
      <SButton :disabled="busy" @click="emit('update:open', false)">{{ t('common.cancel') }}</SButton>
      <SButton variant="danger" :loading="busy" data-testid="account-delete-confirm" @click="remove">{{ t('common.delete') }}</SButton>
    </template>
  </SModal>
</template>
