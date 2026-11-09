<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SHint } from '@sub2api/ui'
import type { AccountTypeEndpoint } from '@/api/types'
import ConversionGradeBadge from '@/components/ConversionGradeBadge.vue'
import { usePlatforms } from '@/composables/platforms'
import { isConvertedGrade } from '@/utils/conversion'

// Endpoints an account type can currently serve, grouped by platform;
// converted ones (and local estimates) are marked with their grade.
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
      <div class="text-xxs font-semibold uppercase tracking-wide text-fg-muted">{{ g.label }}</div>
      <ul class="space-y-0.5">
        <li v-for="e in g.items" :key="`${e.method} ${e.path}`" class="flex flex-wrap items-center gap-1.5 text-xs">
          <code class="font-mono text-gray-700 dark:text-gray-200">{{ e.method }} {{ e.path }}</code>
          <SHint v-if="!compact" inline size="xs" class="font-mono">{{ e.protocol }}</SHint>
          <ConversionGradeBadge v-if="isConvertedGrade(e.grade)" :grade="e.grade" :via="e.via" />
        </li>
      </ul>
    </div>
  </div>
  <p v-else class="text-xs text-warning-600 dark:text-warning-400">{{ t('accounts.noEndpoints') }}</p>
</template>
