<script setup lang="ts">
// The attempts of a retried request, in order (attempt_trail, CONTRACTS §98):
// the account where the caller may know it, the outcome, how long it took and,
// in the detail, the upstream's error and what the core did next. `list` is
// the compact form of a hover card, `flow` the detail's steps (a row on wide
// screens, a column on phones). `accounts` = false leaves the accounts out
// (the caller's own records, which the API sends without them anyway).
import { useI18n } from 'vue-i18n'
import { SBadge, SHint, SIcon } from '@sub2api/ui'
import { useOptionalT } from '@/composables/optionalText'
import { attemptAccountLabel, attemptOk, seconds, type AttemptStep, type AttemptTrail } from './usage'

const props = withDefaults(defineProps<{ trail: AttemptTrail; layout?: 'list' | 'flow'; accounts?: boolean }>(), {
  layout: 'list',
  accounts: true
})
const { t } = useI18n()
const tr = useOptionalT()

const account = (s: AttemptStep) => (props.accounts ? attemptAccountLabel(tr, s) : '')
function outcome(s: AttemptStep): string {
  if (attemptOk(s)) return t('usage.attempts.ok')
  return s.error_type ? tr(`usage.errors.${s.error_type}`, undefined, s.error_type) : t('usage.attempts.failed')
}
</script>

<template>
  <ol v-if="layout === 'list'" class="space-y-1 text-xs" data-testid="attempt-steps">
    <li v-for="(s, i) in trail.steps" :key="i" class="flex items-center gap-2 whitespace-nowrap" data-testid="attempt-step">
      <span class="shrink-0 text-fg-subtle">{{ t('usage.attempts.step', { n: i + 1 }) }}</span>
      <span v-if="account(s)" class="shrink-0 font-mono font-medium" data-testid="attempt-account">{{ account(s) }}</span>
      <SBadge size="xs" :tone="attemptOk(s) ? 'success' : 'danger'">{{ s.status || '—' }} {{ outcome(s) }}</SBadge>
      <span class="ml-auto pl-2 font-mono tabular-nums text-fg-subtle">{{ seconds(s.ms) }}</span>
    </li>
    <li v-if="trail.omitted" class="text-fg-subtle">{{ t('usage.attempts.omitted', { n: trail.omitted }) }}</li>
  </ol>
  <ol v-else class="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-stretch" data-testid="attempt-flow">
    <template v-for="(s, i) in trail.steps" :key="i">
      <li
        class="min-w-0 rounded-lg border px-3 py-2 md:w-56"
        :class="
          attemptOk(s)
            ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-700/60 dark:bg-emerald-900/15'
            : 'border-red-200 bg-red-50/50 dark:border-red-800/50 dark:bg-red-900/10'
        "
        data-testid="attempt-step"
      >
        <div class="flex items-center justify-between gap-2 text-xxs text-fg-subtle">
          <span>{{ t('usage.attempts.step', { n: i + 1 }) }}</span>
          <span class="font-mono tabular-nums">{{ seconds(s.ms) }}</span>
        </div>
        <p v-if="account(s)" class="mt-1 truncate text-sm font-medium" :title="account(s)" data-testid="attempt-account">
          {{ account(s) }}
        </p>
        <div class="mt-1 flex items-center gap-1.5">
          <SBadge size="xs" dot :tone="attemptOk(s) ? 'success' : 'danger'">{{ outcome(s) }}</SBadge>
          <span v-if="s.status" class="font-mono text-xxs tabular-nums text-fg-subtle">{{ s.status }}</span>
        </div>
        <p v-if="s.message" class="mt-1 line-clamp-2 break-all font-mono text-xxs text-fg-muted" :title="s.message">{{ s.message }}</p>
        <SHint v-if="s.next" inline size="xs" class="mt-1">{{ t(`usage.attempts.next.${s.next}`) }}</SHint>
      </li>
      <li v-if="i < trail.steps.length - 1" aria-hidden="true" class="flex items-center justify-center text-fg-subtle">
        <SIcon name="arrow-left" class="h-4 w-4 -rotate-90 md:rotate-180" />
      </li>
    </template>
    <li v-if="trail.omitted" class="self-center text-xs text-fg-subtle">{{ t('usage.attempts.omitted', { n: trail.omitted }) }}</li>
  </ol>
</template>
