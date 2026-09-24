<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge } from '@sub2api/ui'
import type { AccountTypeEndpoint } from '@/api/types'
import { usePlatforms } from '@/composables/platforms'

// Endpoints an account type can currently serve, grouped by platform;
// converted ones (native=false) are marked.
const props = defineProps<{ endpoints: AccountTypeEndpoint[]; compact?: boolean }>()
const { t } = useI18n()
const platforms = usePlatforms()
platforms.load()

const byPlatform = computed(() => {
  const out: Array<{ id: string; label: string; items: AccountTypeEndpoint[] }> = []
  for (const e of props.endpoints) {
    const id = e.platform || '—'
    let g = out.find((x) => x.id === id)
    if (!g) {
      g = { id, label: platforms.label(id), items: [] }
      out.push(g)
    }
    g.items.push(e)
  }
  return out
})
</script>

<template>
  <div v-if="endpoints.length" class="space-y-1.5" data-testid="type-endpoints">
    <div v-for="g in byPlatform" :key="g.id" :data-platform="g.id">
      <div class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-400">{{ g.label }}</div>
      <ul class="space-y-0.5">
        <li v-for="e in g.items" :key="`${e.method} ${e.path}`" class="flex flex-wrap items-center gap-1.5 text-xs">
          <code class="font-mono text-gray-700 dark:text-gray-200">{{ e.method }} {{ e.path }}</code>
          <span v-if="!compact" class="muted font-mono text-[11px]">{{ e.protocol }}</span>
          <SBadge v-if="!e.native" tone="warning" :title="t('platforms.convertedHint', { protocol: e.protocol })">{{ t('platforms.converted') }}</SBadge>
        </li>
      </ul>
    </div>
  </div>
  <p v-else class="text-xs text-amber-600 dark:text-amber-400">{{ t('accounts.noEndpoints') }}</p>
</template>
