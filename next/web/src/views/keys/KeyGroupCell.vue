<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import GroupBadge from '@/components/platform/GroupBadge.vue'
import ProblemIcon from '@/components/ProblemIcon.vue'
import type { ApiKey } from '@/api/types'

// Group of an API key as a badge: its name and the rate its owner pays there, tinted by
// the platforms the key can access (CONTRACTS §13). `platforms` undefined:
// the server did not report them; empty: the key reaches no platform.
// `status` other than active says why the group cannot serve the key
// (deleted, disabled, no longer open to the owner); the owner then picks
// another group. A problem is a warning icon after the badge, its sentence
// in the tooltip, so the cell stays one line.
const props = defineProps<{ name: string; multiplier?: string | number; platforms?: string[] | null; status?: ApiKey['group_status'] }>()
const { t } = useI18n()
const STATUS_PROBLEMS: Record<string, string> = {
  deleted: 'apikeys.groupState.deleted',
  disabled: 'apikeys.groupState.disabled',
  unavailable: 'apikeys.groupState.unavailable'
}
/** Why the group cannot serve the key (message key and tone); a state this console does not know yet is no problem. */
const problem = computed(() => {
  const refused = STATUS_PROBLEMS[props.status ?? '']
  if (refused) return { message: refused, tone: 'danger' as const }
  if (props.platforms && !props.platforms.length) return { message: 'platforms.keyNoPlatforms', tone: 'warning' as const }
  return null
})
</script>

<template>
  <div class="flex min-w-0 max-w-72 items-center gap-1.5 whitespace-nowrap" data-testid="key-group">
    <GroupBadge v-if="status !== 'deleted'" :name="name" :platforms="platforms" :rate="multiplier" />
    <ProblemIcon v-if="problem" :text="t(problem.message)" :tone="problem.tone" data-testid="key-group-problem" />
  </div>
</template>
