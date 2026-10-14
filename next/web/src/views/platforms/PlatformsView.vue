<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SAlert, SBadge, SButton, SCard, SChip, SEmpty, SGrid, SHint, SPageHeader, SSectionTitle, SSpinner, STable, type TableColumn } from '@sub2api/ui'
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
const endpointColumns = computed<TableColumn[]>(() => [
  { key: 'method', label: t('platforms.method'), width: '80px' },
  { key: 'path', label: t('platforms.path') },
  { key: 'protocol', label: t('platforms.protocol') },
  { key: 'billing', label: t('platforms.billing') }
])
const endpointKey = (e: { method: string; path: string }) => `${e.method} ${e.path}`

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
        <SButton :loading="!platforms.loaded.value" icon="refresh" @click="reload">{{ t('common.refresh') }}</SButton>
      </template>
    </SPageHeader>

    <div v-if="!platforms.loaded.value" class="flex justify-center py-10"><SSpinner /></div>
    <template v-else>
      <SAlert v-if="!platforms.complete.value" tone="warning" class="mb-4">{{ t('platforms.fallbackNotice') }}</SAlert>
      <SEmpty v-if="!list.length" :text="t('platforms.none')" />
      <SGrid :cols="1" :xl-cols="2">
        <SCard v-for="p in list" :key="p.id" :data-platform="p.id" data-testid="platform-card">
          <template #title>
            <span class="flex flex-wrap items-center gap-2">
              <span class="font-semibold text-fg">{{ lt(p.label) || p.id }}</span>
              <SHint inline size="xs" class="font-mono">{{ p.id }}</SHint>
              <SBadge v-if="p.builtin" tone="primary">{{ t('platforms.builtin') }}</SBadge>
              <SBadge v-else tone="purple" :title="p.plugin_key || ''">
                <RouterLink v-if="p.plugin_key && auth.has('plugin:read')" :to="`/plugins/${encodeURIComponent(p.plugin_key)}`" class="hover:underline">
                  {{ t('platforms.pluginBy', { name: pluginName(p) || p.plugin_key }) }}
                </RouterLink>
                <template v-else>{{ t('platforms.pluginBy', { name: pluginName(p) || p.plugin_key || '?' }) }}</template>
              </SBadge>
            </span>
          </template>

          <SSectionTitle tag="h4" :title="t('platforms.endpoints')" />
          <STable
            v-if="p.endpoints.length"
            :columns="endpointColumns"
            :rows="p.endpoints.map((e) => ({ ...e, key: endpointKey(e) }))"
            row-key="key"
            dense
          >
            <template #cell-method="{ row }"><SBadge :tone="methodTone(row.method)">{{ row.method }}</SBadge></template>
            <template #cell-path="{ row }"><span class="font-mono text-xs text-fg" data-testid="platform-endpoint">{{ row.path }}</span></template>
            <template #cell-protocol="{ row }"><span class="font-mono text-xs text-fg-muted">{{ row.protocol }}</span></template>
            <template #cell-billing="{ row }">
              <SBadge :tone="row.billing === 'free' ? 'gray' : 'success'">{{ row.billing === 'free' ? t('platforms.free') : t('platforms.billed') }}</SBadge>
            </template>
          </STable>
          <SHint v-else size="xs">{{ t('platforms.noEndpoints') }}</SHint>

          <SSectionTitle tag="h4" class="mt-4" :title="t('platforms.accountTypes')" />
          <div v-if="p.account_types.length" class="flex flex-wrap gap-1.5">
            <SChip
              v-for="at in p.account_types"
              :key="`${at.plugin_key}/${at.type}`"
              :title="`${at.plugin_key}/${at.type}`"
              data-testid="platform-account-type"
            >
              <span class="text-fg-muted">{{ accountTypes.pluginName(at.plugin_key) }} ·</span>
              <span class="ml-1 text-fg">{{ lt(at.label) || at.type }}</span>
            </SChip>
          </div>
          <SHint v-else tone="warning" size="xs">{{ t('platforms.noAccountTypes') }}</SHint>
        </SCard>
      </SGrid>
    </template>
  </div>
</template>
