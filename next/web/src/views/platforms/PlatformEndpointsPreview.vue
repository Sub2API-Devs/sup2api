<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SCode, SHint } from '@sub2api/ui'
import { usePlatforms } from '@/composables/platforms'
import PlatformBadge from '@/components/platform/PlatformBadge.vue'
import { convertedEndpoints } from './convertedEndpoints'

// Endpoints reachable through the given platforms, grouped by platform
// (e.g. what an API key of a group can call). `max` limits endpoints per
// platform. `converted` adds the endpoints of the other platforms that
// accounts of these platforms serve through protocol conversion.
const props = defineProps<{ ids: string[]; max?: number; converted?: boolean }>()
const { t } = useI18n()
const platforms = usePlatforms()
platforms.load()

const groups = computed(() => {
  const own = platforms.endpointsOf(props.ids)
  const extra = props.converted ? convertedEndpoints(platforms.platforms.value, own) : []
  return [...own.map(g => ({ ...g, converted: false })), ...extra.map(g => ({ ...g, known: true, converted: true }))]
})
</script>

<template>
  <div class="space-y-2" data-testid="platform-endpoints">
    <div v-for="g in groups" :key="g.id" :data-platform="g.id" :data-converted="g.converted || undefined">
      <div class="flex items-center gap-1.5">
        <PlatformBadge :id="g.id" />
        <SHint v-if="g.converted" inline size="xs">{{ t('platforms.converted') }}</SHint>
      </div>
      <ul v-if="g.endpoints.length" class="mt-1 space-y-0.5 pl-1">
        <li
          v-for="e in max ? g.endpoints.slice(0, max) : g.endpoints"
          :key="`${e.method} ${e.path}`"
          class="flex flex-wrap items-center gap-1.5 text-xs"
        >
          <SCode inline :text="`${e.method} ${e.path}`" />
          <SHint v-if="e.billing === 'free'" inline size="xs">({{ t('platforms.free') }})</SHint>
        </li>
        <li v-if="max && g.endpoints.length > max">
          <SHint inline size="xs">{{ t('platforms.moreEndpoints', { n: g.endpoints.length - max }) }}</SHint>
        </li>
      </ul>
      <SHint v-else size="xs" class="mt-1 pl-1">{{ g.known ? t('platforms.noEndpoints') : t('platforms.unknownEndpoints') }}</SHint>
    </div>
  </div>
</template>
