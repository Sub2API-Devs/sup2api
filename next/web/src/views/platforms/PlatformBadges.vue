<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge, SHint } from '@sub2api/ui'
import type { AccountTypePlatform } from '@/api/types'
import { usePlatforms } from '@/composables/platforms'

// Platform badges: either plain ids (groups, API keys) or account type
// platforms, whose unavailable entries are greyed with a hint. `size` xs and
// `nowrap` (one line) suit table cells.
const props = defineProps<{ ids?: string[] | null; items?: AccountTypePlatform[] | null; empty?: string; size?: 'xs' | 'sm'; nowrap?: boolean }>()
const { t } = useI18n()
const platforms = usePlatforms()
platforms.load()

const list = computed(() => {
  if (props.items) {
    return props.items.map((p) => ({ id: p.id, label: platforms.label(p.id, p.label), builtin: p.builtin, available: p.available !== false }))
  }
  return (props.ids || []).map((id) => ({ id, label: platforms.label(id), builtin: platforms.find(id)?.builtin ?? false, available: true }))
})
</script>

<template>
  <span v-if="list.length" class="inline-flex items-center gap-1" :class="nowrap ? 'flex-nowrap' : 'flex-wrap'" data-testid="platform-badges">
    <span
      v-for="p in list"
      :key="p.id"
      :title="p.available ? p.id : t('platforms.unavailableHint', { id: p.id })"
      :class="p.available ? '' : 'opacity-60'"
      :data-platform="p.id"
      :data-available="p.available ? '1' : '0'"
    >
      <SBadge :size="size" :tone="!p.available ? 'gray' : p.builtin ? 'primary' : 'accent'">
        <span :class="p.available ? '' : 'line-through'">{{ p.label }}</span>
        <span v-if="!p.available" class="ml-1 text-[10px] no-underline">({{ t('platforms.unavailable') }})</span>
      </SBadge>
    </span>
  </span>
  <SHint v-else-if="empty" inline size="xs">{{ empty }}</SHint>
</template>
