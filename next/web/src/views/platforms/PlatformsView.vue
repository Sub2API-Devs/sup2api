<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge, SButton, SCard, SEmpty, SIcon, SPageHeader, SSpinner } from '@sub2api/ui'
import type { Platform } from '@/api/types'
import { lt } from '@/i18n'
import { usePlatforms } from '@/composables/platforms'
import { useAuthStore } from '@/stores/auth'
import { useAccountTypes } from '@/views/accounts/accountTypes'

// Platforms page (CONTRACTS §13): built-in and plugin platforms, their
// endpoints and the account types that declare support for them.
const { t } = useI18n()
const auth = useAuthStore()
const platforms = usePlatforms()
const accountTypes = useAccountTypes()
platforms.load(true)
accountTypes.load()

const list = computed(() => platforms.platforms.value)

function reload() {
  platforms.load(true)
  accountTypes.load(true)
}

function pluginName(p: Platform): string {
  if (p.plugin_name) return lt(p.plugin_name)
  return p.plugin_key ? accountTypes.pluginName(p.plugin_key) : ''
}

function methodTone(m: string) {
  return m.toUpperCase() === 'GET' ? 'info' : 'primary'
}
</script>

<template>
  <div>
    <SPageHeader :title="t('platforms.title')" :description="t('platforms.description')">
      <template #actions>
        <SButton @click="reload"><SIcon name="refresh" class="h-4 w-4" />{{ t('common.refresh') }}</SButton>
      </template>
    </SPageHeader>

    <div v-if="!platforms.loaded.value" class="flex justify-center py-10"><SSpinner /></div>
    <template v-else>
      <p v-if="!platforms.complete.value" class="mb-4 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
        {{ t('platforms.fallbackNotice') }}
      </p>
      <SEmpty v-if="!list.length" :text="t('platforms.none')" />
      <div class="grid gap-4 xl:grid-cols-2">
        <SCard v-for="p in list" :key="p.id" :data-platform="p.id" data-testid="platform-card">
          <template #title>
            <span class="flex flex-wrap items-center gap-2">
              <span class="font-semibold text-gray-900 dark:text-white">{{ lt(p.label) || p.id }}</span>
              <code class="muted font-mono text-xs">{{ p.id }}</code>
              <SBadge v-if="p.builtin" tone="primary">{{ t('platforms.builtin') }}</SBadge>
              <SBadge v-else tone="purple" :title="p.plugin_key || ''">
                <RouterLink v-if="p.plugin_key && auth.has('plugin:read')" :to="`/plugins/${encodeURIComponent(p.plugin_key)}`" class="hover:underline">
                  {{ t('platforms.pluginBy', { name: pluginName(p) || p.plugin_key }) }}
                </RouterLink>
                <template v-else>{{ t('platforms.pluginBy', { name: pluginName(p) || p.plugin_key || '?' }) }}</template>
              </SBadge>
            </span>
          </template>

          <h4 class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-400">{{ t('platforms.endpoints') }}</h4>
          <div v-if="p.endpoints.length" class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="text-gray-500 dark:text-dark-400">
                <tr>
                  <th class="py-1 pr-3 font-medium">{{ t('platforms.method') }}</th>
                  <th class="py-1 pr-3 font-medium">{{ t('platforms.path') }}</th>
                  <th class="py-1 pr-3 font-medium">{{ t('platforms.protocol') }}</th>
                  <th class="py-1 font-medium">{{ t('platforms.billing') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="e in p.endpoints" :key="`${e.method} ${e.path}`" class="border-t border-gray-100 dark:border-dark-700" data-testid="platform-endpoint">
                  <td class="py-1 pr-3"><SBadge :tone="methodTone(e.method)">{{ e.method }}</SBadge></td>
                  <td class="py-1 pr-3 font-mono text-gray-800 dark:text-gray-200">{{ e.path }}</td>
                  <td class="py-1 pr-3 font-mono text-gray-500 dark:text-dark-400">{{ e.protocol }}</td>
                  <td class="py-1">
                    <SBadge :tone="e.billing === 'free' ? 'gray' : 'success'">{{ e.billing === 'free' ? t('platforms.free') : t('platforms.billed') }}</SBadge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="muted text-xs">{{ t('platforms.noEndpoints') }}</p>

          <h4 class="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-400">{{ t('platforms.accountTypes') }}</h4>
          <div v-if="p.account_types.length" class="flex flex-wrap gap-1.5">
            <span
              v-for="at in p.account_types"
              :key="`${at.plugin_key}/${at.type}`"
              class="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs dark:bg-dark-700"
              :title="`${at.plugin_key}/${at.type}`"
              data-testid="platform-account-type"
            >
              <span class="muted">{{ accountTypes.pluginName(at.plugin_key) }}</span>
              <span class="muted">·</span>
              <span class="font-medium text-gray-800 dark:text-gray-100">{{ lt(at.label) || at.type }}</span>
            </span>
          </div>
          <p v-else class="text-xs text-amber-600 dark:text-amber-400">{{ t('platforms.noAccountTypes') }}</p>
        </SCard>
      </div>
    </template>
  </div>
</template>
