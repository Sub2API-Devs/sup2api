<script setup lang="ts">
// The hover card of a retried request (CONTRACTS §98), around a list mark of
// it (the default slot): its attempts in order, without the accounts in the
// caller's own records (`mine`); a row from before the trail existed has only
// the count, and says so. The mark is focusable so the keyboard reaches the
// card, and a tap opens it on touch screens (STooltip). The list names
// accounts by ID only; their names are in the detail.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { STooltip } from '@sub2api/ui'
import UsageAttemptSteps from './UsageAttemptSteps.vue'
import { attemptTrail, retryCount, type UsageRow } from './usage'

defineOptions({ inheritAttrs: false })
const props = defineProps<{ row: UsageRow; mine?: boolean }>()
const { t } = useI18n()
const trail = computed(() => attemptTrail(props.row))
const retried = computed(() => {
  const n = retryCount(props.row)
  return t('usage.attempts.retried', { n }, n)
})
</script>

<template>
  <STooltip variant="card" placement="bottom" :delay="150" max-width="26rem">
    <!-- role="img": a plain span's aria-label is ignored, and the mark alone (#16 ×2) says nothing out loud. -->
    <span
      v-bind="$attrs"
      tabindex="0"
      role="img"
      :aria-label="retried"
      class="inline-flex shrink-0 items-center rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
    >
      <slot />
    </span>
    <template #content>
      <p class="mb-1.5 text-xs font-medium">{{ t('usage.attempts.title') }} · {{ retried }}</p>
      <UsageAttemptSteps v-if="trail" :trail="trail" :accounts="!mine" />
      <p v-else class="text-xs text-fg-muted" data-testid="attempt-legacy">{{ t('usage.attempts.legacy') }}</p>
    </template>
  </STooltip>
</template>
