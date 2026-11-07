<script setup lang="ts">
import { computed } from 'vue'
import SCopyButton from './SCopyButton.vue'
import { useUiT } from './i18n'

// Display supplied IPv4/IPv6 text without changing its notation or making
// network requests. Filtering belongs to the caller; copying stays in the SDK.
// On phones a long (IPv6) address wraps instead of being cut off.
const props = withDefaults(defineProps<{
  value?: unknown
  copyable?: boolean
  filterable?: boolean
  active?: boolean
  empty?: string
}>(), { copyable: true, filterable: false, active: false, empty: '—' })
const emit = defineEmits<{ (e: 'filter', address: string): void }>()
const t = useUiT()
const address = computed(() => typeof props.value === 'string' ? props.value.trim() : '')
</script>

<template>
  <span class="inline-flex min-w-0 max-w-full items-center gap-1">
    <template v-if="address">
      <button
        v-if="filterable"
        type="button"
        class="min-w-0 truncate rounded-md border px-2 py-0.5 font-mono text-xs transition-colors max-md:whitespace-normal max-md:[overflow-wrap:anywhere] max-md:text-left"
        :class="active
          ? 'border-primary-500 bg-primary-500 text-white'
          : 'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-400 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-300'"
        :title="t('ui.filterByIP', { ip: address })"
        :aria-pressed="active"
        data-testid="ip-address-filter"
        @click.stop="emit('filter', address)"
      >
        {{ address }}
      </button>
      <span v-else class="min-w-0 truncate font-mono text-xs max-md:whitespace-normal max-md:[overflow-wrap:anywhere]" :title="address">{{ address }}</span>
      <SCopyButton v-if="copyable" :text="address" icon-only class="shrink-0" />
    </template>
    <span v-else class="text-fg-subtle">{{ empty }}</span>
  </span>
</template>
