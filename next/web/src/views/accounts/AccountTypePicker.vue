<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { SSpinner } from '@sub2api/ui'
import type { AccountType } from '@/api/types'
import { lt } from '@/i18n'
import { useAuthStore } from '@/stores/auth'
import { useAccountTypes } from './accountTypes'

// Step 1 of "new account": one card per account type declared by enabled
// platform plugins (wireframe A.3).
const emit = defineEmits<{ (e: 'pick', t: AccountType): void }>()
const { t } = useI18n()
const auth = useAuthStore()
const { types, loaded, load } = useAccountTypes()
load(true)

function initial(at: AccountType) {
  return (lt(at.plugin_name) || at.plugin_key || '?').slice(0, 1).toUpperCase()
}
</script>

<template>
  <div>
    <div v-if="!loaded" class="flex justify-center py-10"><SSpinner /></div>
    <div v-else class="grid gap-3 sm:grid-cols-2">
      <button
        v-for="at in types"
        :key="`${at.platform}/${at.type}`"
        type="button"
        class="card flex items-start gap-3 p-4 text-left transition hover:border-primary-300 hover:shadow-card-hover dark:hover:border-primary-700"
        @click="emit('pick', at)"
      >
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-base font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
          {{ initial(at) }}
        </span>
        <span class="min-w-0">
          <span class="block font-medium text-gray-900 dark:text-white">{{ lt(at.plugin_name) || at.plugin_key }}</span>
          <span class="block text-sm text-gray-700 dark:text-gray-300">{{ lt(at.label) || at.type }}</span>
          <span v-if="at.description" class="mt-1 block text-xs text-gray-500 dark:text-dark-400">{{ lt(at.description) }}</span>
          <span class="mt-1 block text-xs text-gray-400">{{ at.plugin_key }}{{ at.plugin_version ? ` v${at.plugin_version}` : '' }} · {{ at.form.mode }}</span>
        </span>
      </button>
      <div class="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 p-4 text-center text-sm text-gray-400 dark:border-dark-700">
        <span class="text-lg">?</span>
        <span>{{ t('accounts.otherPlatforms') }}</span>
      </div>
    </div>
    <p class="mt-4 text-sm text-gray-500 dark:text-dark-400">
      {{ t('accounts.noPlatformHint') }}
      <RouterLink v-if="auth.has('plugin:market:read')" to="/market" class="link">{{ t('accounts.goMarket') }}</RouterLink>
    </p>
  </div>
</template>
