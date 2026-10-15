<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SCard, SHint, SIcon, SSpinner } from '@sub2api/ui'
import { formatMoney } from '@/utils/format'
import { issueText } from './issues'
import type { PriceValidation } from './usePriceValidation'

// "Validation" card of the price editor: local problems first, else the
// server check (errors, cost per million input tokens, warnings).
const props = defineProps<{ localIssues: string[]; validation: PriceValidation | null; error: string; validating: boolean }>()
const { t } = useI18n()

type Line = { tone: 'success' | 'danger' | 'warning' | 'muted'; icon?: string; text: string }
const lines = computed<Line[]>(() => {
  if (props.localIssues.length) return props.localIssues.map((text) => ({ tone: 'danger', icon: 'x', text }))
  if (props.error) return [{ tone: 'danger', text: props.error }]
  const v = props.validation
  if (!v) return [{ tone: 'muted', text: t('prices.validate.pending') }]
  const out: Line[] = []
  if (v.ok && !v.errors.length) out.push({ tone: 'success', icon: 'check', text: t('prices.validate.ok') })
  out.push(...v.errors.map((x): Line => ({ tone: 'danger', icon: 'x', text: issueText(x) })))
  if (v.cost_per_million_input !== undefined && v.cost_per_million_input !== null) {
    out.push({ tone: 'muted', text: t('prices.validate.costPerMillion', { cost: formatMoney(v.cost_per_million_input) }) })
  }
  out.push(...v.warnings.map((x): Line => ({ tone: 'warning', icon: 'warning', text: issueText(x) })))
  return out
})
</script>

<template>
  <SCard :title="t('prices.validate.title')">
    <template #actions><SSpinner v-if="validating" size="sm" /></template>
    <div class="space-y-1">
      <SHint v-for="(x, i) in lines" :key="i" :tone="x.tone" class="flex items-start gap-1">
        <SIcon v-if="x.icon" :name="x.icon" class="mt-0.5 h-4 w-4 shrink-0" />{{ x.text }}
      </SHint>
    </div>
  </SCard>
</template>
