<script setup lang="ts">
// Deleting an account. A type whose plugin can keep the account's runtime
// resources for a while (lifecycle.deletion.retentionDays) offers that here;
// the days come from the manifest, the core refuses any other choice.
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SHint, SModal, SRadioGroup, toast } from '@sub2api/ui'
import type { Account, AccountType } from '@/api/types'
import { notifyError } from '@/utils/errors'

const props = defineProps<{ open: boolean; account: Account | null; accountType?: AccountType | null }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'deleted'): void }>()
const { t } = useI18n()

const retention = computed(() => props.accountType?.lifecycle?.deletion?.retentionDays ?? 0)
const keep = ref<'now' | 'retain'>('now')
const busy = ref(false)
const choices = computed(() => [
  { value: 'now', label: t('accounts.deleteResources.now') },
  { value: 'retain', label: t('accounts.deleteResources.retain', { days: retention.value }) },
])
watch(() => props.open, open => { if (open) keep.value = 'now' })

async function remove() {
  if (!props.account || busy.value) return
  busy.value = true
  try {
    await api.del(`/accounts/${props.account.id}${keep.value === 'retain' ? '?retain_resources=1' : ''}`)
    toast(t('common.deleted'), 'success')
    emit('update:open', false)
    emit('deleted')
  } catch (e) {
    notifyError(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <SModal :open="open" :title="t('common.delete')" width="sm" @update:open="v => emit('update:open', v)">
    <div class="space-y-3">
      <p>{{ t('common.confirmDelete', { name: account?.name ?? '' }) }}</p>
      <template v-if="retention > 0">
        <SRadioGroup v-model="keep" :options="choices" :aria-label="t('accounts.deleteResources.label')" data-testid="account-delete-resources" />
        <SHint>{{ keep === 'retain' ? t('accounts.deleteResources.retainHint', { days: retention }) : t('accounts.deleteResources.nowHint') }}</SHint>
      </template>
    </div>
    <template #footer>
      <SButton :disabled="busy" @click="emit('update:open', false)">{{ t('common.cancel') }}</SButton>
      <SButton variant="danger" :loading="busy" data-testid="account-delete-confirm" @click="remove">{{ t('common.delete') }}</SButton>
    </template>
  </SModal>
</template>
