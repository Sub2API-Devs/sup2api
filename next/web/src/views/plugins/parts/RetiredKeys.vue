<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SBadge, SButton, SCard, SCheckbox, SField, SHint, SIcon, SInput, SModal, STable, toast, type TableColumn } from '@sub2api/ui'
import type { ReleaseRetiredKeyResult, RetiredKey } from '@/api/types'
import { notifyError } from '@/utils/errors'
import { useAuthStore } from '@/stores/auth'
import { formatDateTime } from '@/utils/format'

// Keys of uninstalled plugins stay with their publisher (CONTRACTS §55.1): only
// that publisher may install the key again until an administrator releases
// it here, optionally deleting what the plugin left behind.
const { t } = useI18n()
const auth = useAuthStore()

const items = ref<RetiredKey[]>([])
const releasing = ref<RetiredKey | null>(null)
const purge = ref(false)
const purgeAccounts = ref(false)
const typed = ref('')
const busy = ref(false)
const matches = computed(() => !!releasing.value && typed.value.trim() === releasing.value.key)

const columns = computed<TableColumn[]>(() => [
  { key: 'key', label: t('plugins.retired.key') },
  { key: 'publisher', label: t('plugins.publisher') },
  { key: 'left', label: t('plugins.retired.left') },
  { key: 'retired_at', label: t('plugins.retired.retiredAt') },
  { key: 'actions', label: '', align: 'right' }
])

async function load() {
  try {
    const r = await api.get<{ items: RetiredKey[] }>('/plugins/retired-keys')
    items.value = r.items || []
  } catch (e) {
    notifyError(e)
  }
}

function openRelease(k: RetiredKey) {
  releasing.value = k
  purge.value = false
  purgeAccounts.value = false
  typed.value = ''
}

async function release() {
  const k = releasing.value
  if (!k || !matches.value) return
  busy.value = true
  try {
    const r = await api.post<ReleaseRetiredKeyResult>(`/plugins/retired-keys/${encodeURIComponent(k.key)}/release`, {
      purge: purge.value,
      purge_accounts: purgeAccounts.value
    })
    toast(t('plugins.retired.released', { key: k.key, n: r?.accounts_deleted ?? 0 }), 'success')
    releasing.value = null
    await load()
  } catch (e) {
    notifyError(e)
  } finally {
    busy.value = false
  }
}

onMounted(load)
defineExpose({ load })
</script>

<template>
  <SCard v-if="items.length" class="mt-6" :title="t('plugins.retired.title')" data-testid="retired-keys">
    <SHint class="mb-3">{{ t('plugins.retired.description') }}</SHint>
    <STable :columns="columns" :rows="items" row-key="key">
      <template #cell-key="{ row }">
        <span class="font-mono text-sm">{{ row.key }}</span>
        <SBadge v-if="row.installed" tone="info" class="ml-2">{{ t('plugins.retired.reinstalled') }}</SBadge>
      </template>
      <template #cell-publisher="{ row }">
        <span class="text-sm">{{ row.publisher || t('plugins.retired.unsigned') }}</span>
      </template>
      <template #cell-left="{ row }">
        <div class="flex flex-wrap gap-1">
          <SBadge v-if="row.accounts > 0" tone="warning">{{ t('plugins.retired.accounts', { n: row.accounts }) }}</SBadge>
          <SBadge v-if="row.schema" tone="warning">plg_{{ row.key }}</SBadge>
          <SHint v-if="!row.accounts && !row.schema" inline>—</SHint>
        </div>
      </template>
      <template #cell-retired_at="{ row }">
        <span class="text-sm">{{ formatDateTime(row.retired_at) }}</span>
      </template>
      <template #cell-actions="{ row }">
        <SButton v-if="auth.has('plugin:uninstall') && !row.installed" size="sm" @click="openRelease(row)">
          <SIcon name="key" class="h-4 w-4" />{{ t('plugins.retired.release') }}
        </SButton>
      </template>
    </STable>

    <SModal :open="!!releasing" :title="releasing ? t('plugins.retired.releaseTitle', { key: releasing.key }) : ''" width="md" @update:open="(v) => !v && (releasing = null)">
      <div v-if="releasing" class="space-y-4 text-sm">
        <p>{{ t('plugins.retired.releaseBody') }}</p>
        <SCheckbox
          v-model="purgeAccounts"
          class="!items-start rounded-lg border p-3"
          :class="purgeAccounts ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30' : 'border-gray-200 dark:border-dark-700'"
        >
          <span class="font-medium">{{ t('plugins.retired.purgeAccounts', { n: releasing.accounts }) }}</span>
        </SCheckbox>
        <SCheckbox
          v-model="purge"
          class="!items-start rounded-lg border p-3"
          :class="purge ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30' : 'border-gray-200 dark:border-dark-700'"
        >
          <span class="font-medium">{{ t('plugins.retired.purge', { schema: 'plg_' + releasing.key }) }}</span>
        </SCheckbox>
        <p v-if="!purge || !purgeAccounts" class="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
          <SIcon name="warning" class="h-4 w-4" />{{ t('plugins.retired.inheritWarn') }}
        </p>
        <SField :label="t('plugins.uninstall.typeKey', { key: releasing.key })">
          <SInput v-model="typed" mono :placeholder="releasing.key" autocomplete="off" @keyup.enter="release" />
        </SField>
      </div>
      <template #footer>
        <SButton :disabled="busy" @click="releasing = null">{{ t('common.cancel') }}</SButton>
        <SButton variant="danger" :loading="busy" :disabled="!matches" @click="release">{{ t('plugins.retired.release') }}</SButton>
      </template>
    </SModal>
  </SCard>
</template>
