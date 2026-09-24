<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SModal, SIcon, toast } from '@sub2api/ui'
import type { UninstallResult } from '@/api/types'
import { notifyError } from '@/utils/errors'

// DELETE /plugins/:key?purge=&purge_accounts= (CONTRACTS §5.7, §14.3).
// Accounts of the plugin's account types are kept (orphaned) unless
// purge_accounts is set; the response then reports accounts_deleted.
const props = defineProps<{ open: boolean; pluginKey: string; name: string }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void; (e: 'done'): void }>()
const { t } = useI18n()

const purge = ref(false)
const purgeAccounts = ref(false)
const typed = ref('')
const busy = ref(false)
/** Set after a successful uninstall with purge_accounts: the modal shows the result. */
const result = ref<{ accountsDeleted: number | null } | null>(null)
const matches = computed(() => typed.value.trim() === props.pluginKey)

watch(
  () => props.open,
  (v) => {
    if (v) {
      purge.value = false
      purgeAccounts.value = false
      typed.value = ''
      result.value = null
    }
  }
)

async function submit() {
  if (!matches.value || result.value) return
  busy.value = true
  try {
    const r = await api.del<UninstallResult | null>(`/plugins/${encodeURIComponent(props.pluginKey)}`, {
      purge: purge.value,
      purge_accounts: purgeAccounts.value || undefined
    })
    const n = r && typeof r === 'object' && r.accounts_deleted !== undefined ? Number(r.accounts_deleted) : null
    toast(t('plugins.uninstall.done', { name: props.name }), 'success')
    if (purgeAccounts.value) {
      // Keep the dialog open to show how many accounts were deleted.
      result.value = { accountsDeleted: n }
      return
    }
    emit('update:open', false)
    emit('done')
  } catch (e) {
    notifyError(e)
  } finally {
    busy.value = false
  }
}

function close() {
  emit('update:open', false)
  if (result.value) emit('done')
}
</script>

<template>
  <SModal :open="open" :title="t('plugins.uninstall.title', { name })" width="md" @update:open="(v) => (v ? emit('update:open', v) : close())">
    <div v-if="result" class="space-y-3 text-sm" data-testid="uninstall-result">
      <p class="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-400">
        <SIcon name="check" class="h-5 w-5" />{{ t('plugins.uninstall.done', { name }) }}
      </p>
      <p v-if="result.accountsDeleted !== null" data-testid="accounts-deleted">{{ t('plugins.uninstall.accountsDeleted', { n: result.accountsDeleted }) }}</p>
    </div>
    <div v-else class="space-y-4 text-sm">
      <p>{{ t('plugins.uninstall.body') }}</p>
      <label
        class="flex items-start gap-2 rounded-lg border p-3"
        :class="purge ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30' : 'border-gray-200 dark:border-dark-700'"
      >
        <input v-model="purge" type="checkbox" class="checkbox mt-0.5" data-testid="uninstall-purge" />
        <span>
          <span class="font-medium">{{ t('plugins.uninstall.purge', { schema: 'plg_' + pluginKey }) }}</span>
          <span class="mt-0.5 block text-xs muted">{{ t('plugins.uninstall.purgeHint') }}</span>
        </span>
      </label>
      <label
        class="flex items-start gap-2 rounded-lg border p-3"
        :class="purgeAccounts ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30' : 'border-gray-200 dark:border-dark-700'"
      >
        <input v-model="purgeAccounts" type="checkbox" class="checkbox mt-0.5" data-testid="uninstall-purge-accounts" />
        <span>
          <span class="font-medium">{{ t('plugins.uninstall.purgeAccounts') }}</span>
          <span class="mt-0.5 block text-xs muted">{{ t('plugins.uninstall.purgeAccountsHint') }}</span>
        </span>
      </label>
      <p v-if="purge" class="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
        <SIcon name="warning" class="h-4 w-4" />{{ t('plugins.uninstall.purgeWarn') }}
      </p>
      <p v-if="purgeAccounts" class="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
        <SIcon name="warning" class="h-4 w-4" />{{ t('plugins.uninstall.purgeAccountsWarn') }}
      </p>
      <div>
        <label class="input-label">{{ t('plugins.uninstall.typeKey', { key: pluginKey }) }}</label>
        <input v-model="typed" class="input font-mono" :placeholder="pluginKey" autocomplete="off" @keyup.enter="submit" />
      </div>
    </div>
    <template #footer>
      <SButton v-if="result" variant="primary" @click="close">{{ t('common.close') }}</SButton>
      <template v-else>
        <SButton :disabled="busy" @click="emit('update:open', false)">{{ t('common.cancel') }}</SButton>
        <SButton variant="danger" :loading="busy" :disabled="!matches" @click="submit">
          <SIcon name="trash" class="h-4 w-4" />{{ t('plugins.uninstall.confirm') }}
        </SButton>
      </template>
    </template>
  </SModal>
</template>
