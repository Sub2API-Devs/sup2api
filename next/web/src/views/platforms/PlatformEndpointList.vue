<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { SCode, SHint } from '@sub2api/ui'
import type { PlatformEndpoint } from '@/api/types'
import PlatformBadge from '@/components/platform/PlatformBadge.vue'

// The endpoints of one platform under its brand badge. `max` limits how many
// are listed; `converted` marks a platform reached through protocol
// conversion; `known` is false for a platform the list does not have.
defineProps<{ id: string; endpoints: PlatformEndpoint[]; known?: boolean; converted?: boolean; max?: number }>()
const { t } = useI18n()
</script>

<template>
  <div :data-platform="id" :data-converted="converted || undefined">
    <div class="flex items-center gap-1.5">
      <PlatformBadge :id="id" />
      <SHint v-if="converted" inline size="xs">{{ t('platforms.converted') }}</SHint>
    </div>
    <ul v-if="endpoints.length" class="mt-1 space-y-0.5 pl-1">
      <li
        v-for="e in max ? endpoints.slice(0, max) : endpoints"
        :key="`${e.method} ${e.path}`"
        class="flex flex-wrap items-center gap-1.5 text-xs"
      >
        <SCode inline class="min-w-0 break-words" :text="`${e.method} ${e.path}`" />
        <SHint v-if="e.billing === 'free'" inline size="xs">({{ t('platforms.free') }})</SHint>
      </li>
      <li v-if="max && endpoints.length > max">
        <SHint inline size="xs">{{ t('platforms.moreEndpoints', { n: endpoints.length - max }) }}</SHint>
      </li>
    </ul>
    <SHint v-else size="xs" class="mt-1 pl-1">{{ known ? t('platforms.noEndpoints') : t('platforms.unknownEndpoints') }}</SHint>
  </div>
</template>
