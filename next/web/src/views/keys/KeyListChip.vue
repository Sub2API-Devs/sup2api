<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SChip, STooltip } from '@sub2api/ui'

// A key restriction as one chip: `emptyLabel` when nothing restricts the key,
// else `label` with the entries listed in its tooltip (IPs, models), which
// keyboard focus opens too. The #item slot draws an entry (plain monospace
// text by default), #lead goes before the label.
const props = defineProps<{ items?: readonly string[] | null; emptyLabel: string; label: string }>()
const { t } = useI18n()

/** How many entries the tooltip lists: it takes no pointer, so a longer list could not be scrolled. */
const LISTED = 10
const listed = computed(() => props.items?.slice(0, LISTED) ?? [])
const more = computed(() => (props.items?.length ?? 0) - listed.value.length)
</script>

<template>
  <SChip v-if="!items?.length" size="xs">{{ emptyLabel }}</SChip>
  <STooltip v-else variant="card">
    <SChip size="xs" tone="info" tabindex="0" class="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40">
      <span class="inline-flex items-center gap-0.5 align-middle"><slot name="lead" />{{ label }}</span>
    </SChip>
    <template #content>
      <ul class="space-y-1 font-mono text-xs">
        <li v-for="item in listed" :key="item">
          <slot name="item" :item="item">{{ item }}</slot>
        </li>
        <li v-if="more > 0" class="font-sans text-fg-muted" data-testid="key-list-more">{{ t('apikeys.listMore', { n: more }) }}</li>
      </ul>
    </template>
  </STooltip>
</template>
