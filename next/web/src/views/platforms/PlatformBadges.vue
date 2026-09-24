<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge } from '@sub2api/ui'
import type { AccountTypePlatform } from '@/api/types'
import { usePlatforms } from '@/composables/platforms'

// Platform badges: either plain ids (groups, API keys) or account type
// platforms, whose unavailable entries are greyed with a hint.
const props = defineProps<{ ids?: string[] | null; items?: AccountTypePlatform[] | null; empty?: string }>()
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
  <span v-if="list.length" class="inline-flex flex-wrap items-center gap-1" data-testid="platform-badges">
    <span
      v-for="p in list"
      :key="p.id"
      :title="p.available ? p.id : t('platforms.unavailableHint', { id: p.id })"
      :class="p.available ? '' : 'opacity-60'"
      :data-platform="p.id"
      :data-available="p.available ? '1' : '0'"
    >
      <SBadge :tone="!p.available ? 'gray' : p.builtin ? 'primary' : 'purple'">
        <span :class="p.available ? '' : 'line-through'">{{ p.label }}</span>
        <span v-if="!p.available" class="ml-1 text-[10px] no-underline">({{ t('platforms.unavailable') }})</span>
      </SBadge>
    </span>
  </span>
  <span v-else-if="empty" class="muted text-xs">{{ empty }}</span>
</template>
