<script setup lang="ts">
// The accounts a retried request tried before the one that answered, as a
// one-line prefix of the account cell: "#12 → #15 →" (CONTRACTS §98). Repeats
// of an account in a row fold into "#12 ×2"; past two earlier accounts the
// chain keeps the first and counts the rest ("#12 → +3 →"), so the final
// account's label beside it keeps its room. The whole chain is in the card.
import { computed } from 'vue'
import { useOptionalT } from '@/composables/optionalText'
import UsageAttemptCard from './UsageAttemptCard.vue'
import { attemptAccountLabel, attemptRuns, attemptTrail, type AttemptRun, type UsageRow } from './usage'

const props = defineProps<{ row: UsageRow }>()
const tr = useOptionalT()
/** The earlier runs, then the number of the runs and unrecorded attempts left out. */
const links = computed<Array<AttemptRun | number>>(() => {
  const trail = attemptTrail(props.row)
  if (!trail) return []
  // The last recorded attempt is the final account's, already in the cell, unless attempts past the recorded ones followed it.
  const runs = attemptRuns(trail.omitted ? trail.steps : trail.steps.slice(0, -1))
  const kept = runs.length > 2 ? runs.slice(0, 1) : runs
  const more = runs.length - kept.length + (trail.omitted ?? 0)
  return more ? [...kept, more] : kept
})
</script>

<template>
  <UsageAttemptCard v-if="links.length" :row="row" data-testid="usage-attempt-chain">
    <span class="inline-flex items-center gap-1 whitespace-nowrap text-xxs">
      <template v-for="(link, i) in links" :key="i">
        <span v-if="typeof link === 'number'" class="rounded-full border border-line px-1.5 py-0.5 text-fg-subtle">+{{ link }}</span>
        <span
          v-else
          class="rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5 font-mono text-red-700 dark:border-red-800/60 dark:bg-red-900/20 dark:text-red-300"
          data-testid="attempt-link"
          >{{ attemptAccountLabel(tr, link.step) }}<template v-if="link.times > 1"> ×{{ link.times }}</template></span
        >
        <span class="text-fg-subtle" aria-hidden="true">→</span>
      </template>
    </span>
  </UsageAttemptCard>
</template>
