<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge, SCode, SHint } from '@sub2api/ui'
import { usePlatforms } from '@/composables/platforms'

// Endpoints reachable through the given platforms, grouped by platform
// (e.g. what an API key of a group can call). `max` limits endpoints per platform.
const props = defineProps<{ ids: string[]; max?: number }>()
const { t } = useI18n()
const platforms = usePlatforms()
platforms.load()

const groups = computed(() => platforms.endpointsOf(props.ids))
</script>

<template>
  <div class="space-y-2" data-testid="platform-endpoints">
    <div v-for="g in groups" :key="g.id" :data-platform="g.id">
      <div class="flex items-center gap-1.5 text-xs font-medium text-fg">
        <SBadge :tone="g.builtin ? 'primary' : 'purple'">{{ g.label }}</SBadge>
      </div>
      <ul v-if="g.endpoints.length" class="mt-1 space-y-0.5 pl-1">
        <li v-for="e in max ? g.endpoints.slice(0, max) : g.endpoints" :key="`${e.method} ${e.path}`" class="flex flex-wrap items-center gap-1.5 text-xs">
          <SCode inline :text="`${e.method} ${e.path}`" />
          <SHint v-if="e.billing === 'free'" inline size="xs">({{ t('platforms.free') }})</SHint>
        </li>
        <li v-if="max && g.endpoints.length > max"><SHint inline size="xs">{{ t('platforms.moreEndpoints', { n: g.endpoints.length - max }) }}</SHint></li>
      </ul>
      <SHint v-else size="xs" class="mt-1 pl-1">{{ g.known ? t('platforms.noEndpoints') : t('platforms.unknownEndpoints') }}</SHint>
    </div>
  </div>
</template>
