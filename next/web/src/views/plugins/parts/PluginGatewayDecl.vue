<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge } from '@sub2api/ui'
import type { AccountTypePlatform } from '@/api/types'
import { lt } from '@/i18n'
import { BUILTIN_PLATFORMS } from '@/composables/platforms'
import PlatformBadges from '@/views/platforms/PlatformBadges.vue'
import type { AccountTypeSummary, PlatformSummary } from '../pluginUtil'

// What a plugin declares for the gateway (CONTRACTS §13): its own new
// platforms with their endpoints, and its account types with the platforms
// each supports. Shared by the consent page and the plugin detail.
const props = defineProps<{ platforms: PlatformSummary[]; accountTypes: AccountTypeSummary[]; section?: 'platforms' | 'account_types' }>()
const { t } = useI18n()

const builtinIds = new Set(BUILTIN_PLATFORMS.map((p) => p.id))

function typePlatforms(a: AccountTypeSummary): AccountTypePlatform[] {
  return a.platforms.map((id) => {
    const own = props.platforms.find((p) => p.id === id)
    return { id, label: own?.label ?? id, builtin: builtinIds.has(id), available: true }
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
          <code class="muted font-mono">{{ p.id }}</code>
        </div>
        <ul v-if="p.endpoints.length" class="mt-1 space-y-0.5 pl-3">
          <li v-for="e in p.endpoints" :key="`${e.method} ${e.path}`" class="flex flex-wrap items-center gap-1.5" data-testid="plugin-platform-endpoint">
            <code class="font-mono text-gray-800 dark:text-gray-100">{{ e.method }} {{ e.path }}</code>
            <span v-if="e.protocol" class="muted font-mono text-[11px]">{{ e.protocol }}</span>
            <SBadge :tone="e.billing === 'free' ? 'gray' : 'success'">{{ e.billing === 'free' ? t('platforms.free') : t('platforms.billed') }}</SBadge>
          </li>
        </ul>
        <p v-else class="muted mt-1 pl-3">{{ t('platforms.noEndpoints') }}</p>
      </div>
    </div>
    <div v-if="showTypes" class="space-y-1">
      <div v-for="a in accountTypes" :key="a.id" class="flex flex-wrap items-center gap-1.5 text-xs" data-testid="plugin-account-type">
        <span class="font-medium">{{ lt(a.label) || a.id }}</span>
        <span class="muted font-mono">({{ a.id }})</span>
        <span class="muted">— {{ t('platforms.supported') }}:</span>
        <PlatformBadges :items="typePlatforms(a)" empty="—" />
      </div>
    </div>
  </div>
</template>
