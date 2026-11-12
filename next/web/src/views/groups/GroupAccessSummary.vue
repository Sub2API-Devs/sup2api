<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge, SHint, SIcon } from '@sub2api/ui'
import type { Group } from '@/api/types'
import SegmentBadge from '@/components/pricing/SegmentBadge.vue'

// Who may use a group, short enough for a table cell: everyone for a public
// group; for a private one the named user groups it is granted to (the first
// few) and how many personal ones, or a warning when nobody is.
const props = defineProps<{ group: Pick<Group, 'visibility' | 'access'> }>()
const { t } = useI18n()

/** Named user groups shown before the rest folds into "+N". */
const SHOWN = 2
const segments = computed(() => props.group.access?.segments ?? [])
const personal = computed(() => props.group.access?.personal_count ?? 0)
</script>

<template>
  <SHint v-if="group.visibility === 'public'" inline data-testid="group-access">{{ t('groups.access.everyone') }}</SHint>
  <SBadge v-else-if="!segments.length && !personal" tone="warning" data-testid="group-access">{{ t('groups.access.nobody') }}</SBadge>
  <span v-else class="inline-flex max-w-[15rem] flex-wrap items-center gap-1" data-testid="group-access">
    <SegmentBadge v-for="s in segments.slice(0, SHOWN)" :key="s.id" :segment="s" />
    <SHint v-if="segments.length > SHOWN" inline size="xs" :title="segments.map((s) => s.name).join(', ')">+{{ segments.length - SHOWN }}</SHint>
    <SBadge v-if="personal" tone="accent" data-testid="group-access-personal">
      <SIcon name="user" class="h-3 w-3 shrink-0" />
      {{ t('groups.access.personal', { n: personal }, personal) }}
    </SBadge>
  </span>
</template>
