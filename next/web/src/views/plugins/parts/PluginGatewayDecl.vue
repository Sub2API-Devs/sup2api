<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge, SHint } from '@sub2api/ui'
import { lt } from '@/i18n'
import { usePlatforms } from '@/composables/platforms'
import type { AccountTypeSummary, PlatformSummary } from '../pluginUtil'

// What a plugin declares for the gateway (CONTRACTS §13): its own new
// platforms with their endpoints, and its account types with the platforms
// each supports. Shared by the consent page and the plugin detail.
const props = defineProps<{ platforms: PlatformSummary[]; accountTypes: AccountTypeSummary[]; section?: 'platforms' | 'account_types' }>()
const { t } = useI18n()
const catalog = usePlatforms()
onMounted(() => catalog.load())

function accountPlatforms(a: AccountTypeSummary) {
  return (a.platformDeclarations ?? a.platforms.map(platform => ({ platform, endpoints: undefined }))).map(decl => {
    const p = props.platforms.find(p => p.id === decl.platform) ?? catalog.find(decl.platform)
    const endpoints = p?.endpoints ?? []
    return {
      id: decl.platform,
      label: p?.label ?? decl.platform,
      endpoints: decl.endpoints === undefined ? endpoints : endpoints.filter(e => e.id && decl.endpoints?.includes(e.id)),
      unresolved: (decl.endpoints ?? []).filter(id => !endpoints.some(e => e.id === id))
    }
  })
}

const showPlatforms = computed(() => props.section !== 'account_types' && props.platforms.length > 0)
const showTypes = computed(() => props.section !== 'platforms' && props.accountTypes.length > 0)
</script>

<template>
  <div class="space-y-3">
    <div v-if="showPlatforms" class="space-y-2" data-testid="plugin-platforms">
      <div v-for="p in platforms" :key="p.id" class="text-xs" :data-platform="p.id">
        <div class="flex flex-wrap items-center gap-1.5">
          <SBadge tone="purple">{{ lt(p.label) || p.id }}</SBadge>
          <SHint inline size="xs" class="font-mono">{{ p.id }}</SHint>
        </div>
        <ul v-if="p.endpoints.length" class="mt-1 space-y-0.5 pl-3">
          <li
            v-for="e in p.endpoints"
            :key="`${e.method} ${e.path}`"
            class="flex flex-wrap items-center gap-1.5"
            data-testid="plugin-platform-endpoint"
          >
            <code class="font-mono text-gray-800 dark:text-gray-100">{{ e.method }} {{ e.path }}</code>
            <SHint v-if="e.protocol" inline size="xs" class="font-mono">{{ e.protocol }}</SHint>
            <SBadge :tone="e.billing === 'free' ? 'gray' : 'success'">{{
              e.billing === 'free' ? t('platforms.free') : t('platforms.billed')
            }}</SBadge>
          </li>
        </ul>
        <SHint v-else size="xs" class="mt-1 pl-3">{{ t('platforms.noEndpoints') }}</SHint>
      </div>
    </div>
    <div v-if="showTypes" class="space-y-1">
      <div v-for="a in accountTypes" :key="a.id" class="space-y-2 text-xs" data-testid="plugin-account-type">
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="font-medium">{{ lt(a.label) || a.id }}</span>
          <SHint inline size="xs" class="font-mono">({{ a.id }})</SHint>
        </div>
        <div
          v-for="p in accountPlatforms(a)"
          :key="p.id"
          class="ml-3 border-l border-gray-200 pl-3 dark:border-gray-700"
          data-testid="plugin-account-platform"
        >
          <SBadge tone="purple">{{ lt(p.label) || p.id }}</SBadge>
          <ul class="mt-1 space-y-1">
            <li
              v-for="e in p.endpoints"
              :key="e.id || `${e.method} ${e.path}`"
              class="flex flex-wrap items-center gap-1.5"
              data-testid="plugin-account-endpoint"
            >
              <code>{{ e.method }} {{ e.path }}</code>
              <SHint inline size="xs">{{ e.protocol }}</SHint>
              <SBadge :tone="e.billing === 'free' ? 'gray' : 'success'">{{
                e.billing === 'free' ? t('platforms.free') : t('platforms.billed')
              }}</SBadge>
            </li>
            <li v-for="id in p.unresolved" :key="id">
              <code>{{ id }}</code> <SHint inline size="xs">{{ t('platforms.noEndpoints') }}</SHint>
            </li>
          </ul>
          <SHint v-if="!p.endpoints.length && !p.unresolved.length" size="xs">{{ t('platforms.noEndpoints') }}</SHint>
        </div>
      </div>
    </div>
  </div>
</template>
