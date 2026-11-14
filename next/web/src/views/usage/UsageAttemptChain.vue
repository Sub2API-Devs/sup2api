<script setup lang="ts">
// The accounts a retried request tried before the one that answered, as a
// one-line prefix of the account cell: "#12 → #15 →" (CONTRACTS §98). Repeats
// of an account in a row fold into "#12 ×2"; past three earlier accounts the
// chain keeps the first and the last with "+N" between, to stay on one line.
// The whole chain, with outcomes and times, is in the card on hover / focus /
// tap. The list names accounts by ID only; their names are in the detail.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { STooltip } from '@sub2api/ui'
import { useOptionalT } from '@/composables/optionalText'
import UsageAttemptSteps from './UsageAttemptSteps.vue'
import { attemptAccountLabel, attemptRuns, attemptTrail, retryCount, type AttemptRun, type UsageRow } from './usage'

const props = defineProps<{ row: UsageRow }>()
const { t } = useI18n()
const tr = useOptionalT()
const trail = computed(() => attemptTrail(props.row))
/** The earlier runs, or a number standing for the runs folded away. */
const links = computed<Array<AttemptRun | number>>(() => {
  const runs = attemptRuns(trail.value?.steps.slice(0, -1) ?? [])
  return runs.length > 3 ? [runs[0], runs.length - 2, runs[runs.length - 1]] : runs
})
</script>

<template>
  <STooltip v-if="links.length" variant="card" placement="bottom" :delay="150" max-width="26rem">
    <span
      class="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xxs"
      tabindex="0"
      :aria-label="t('usage.attempts.retried', { n: retryCount(row) })"
      data-testid="usage-attempt-chain"
    >
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
    <template #content>
      <p class="mb-1.5 text-xs font-medium">{{ t('usage.attempts.title') }} · {{ t('usage.attempts.retried', { n: retryCount(row) }) }}</p>
      <UsageAttemptSteps v-if="trail" :trail="trail" />
    </template>
  </STooltip>
</template>
