<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SButton, SGrid, SHint, SInput, SSectionTitle, SSelect } from '@sub2api/ui'
import { CACHE_VARS, newTier, TOKEN_VARS, type MarkupRule, type VisualConfig } from './priceExpr'

// Visual editor for the expression mode: len tiers + markup rules.
// Mutates the bound config in place (deep v-model).
const model = defineModel<VisualConfig>({ required: true })
defineProps<{ disabled?: boolean }>()
const { t } = useI18n()

const priceKeys = [...TOKEN_VARS, 'flat'] as const

function unsettable(k: string) {
  return (CACHE_VARS as readonly string[]).includes(k)
}

function addTier() {
  const tiers = model.value.tiers
  const n = tiers.length
  if (n === 0) {
    tiers.push(newTier('base', null))
    return
  }
  // Insert a bounded tier before the "otherwise" tier.
  const prevMax = tiers.slice(0, -1).reduce((m, x) => Math.max(m, Number(x.max_len) || 0), 0)
  const tier = newTier(`tier_${n + 1}`, prevMax ? prevMax * 2 : 200000)
  const last = tiers[n - 1]
  for (const k of TOKEN_VARS) tier[k] = last[k]
  tier.flat = last.flat
  tiers.splice(n - 1, 0, tier)
}

function removeTier(i: number) {
  model.value.tiers.splice(i, 1)
  const tiers = model.value.tiers
  if (tiers.length) tiers[tiers.length - 1].max_len = null
}

function defaultRule(kind: MarkupRule['kind'], multiplier = 1): MarkupRule {
  if (kind === 'header') return { kind, name: '', op: 'contains', value: '', multiplier }
  if (kind === 'param') return { kind, path: '', op: 'eq', value: '', multiplier }
  return { kind, tz: 'Asia/Shanghai', from_hour: 0, to_hour: 8, multiplier }
}

function addRule() {
  model.value.rules.push(defaultRule('header', 2))
}

function setKind(i: number, kind: MarkupRule['kind']) {
  model.value.rules.splice(i, 1, defaultRule(kind, model.value.rules[i].multiplier))
}

const hours = Array.from({ length: 25 }, (_, i) => i)
const hourOptions = computed(() => hours.map((h) => ({ value: h, label: t('prices.visual.hour', { h }) })))
const kindOptions = computed(() =>
  (['header', 'param', 'time'] as const).map((k) => ({ value: k, label: t(`prices.visual.kind.${k}`) }))
)
const headerOpOptions = computed(() => [
  { value: 'contains', label: t('prices.visual.op.contains') },
  { value: 'eq', label: t('prices.visual.op.eq') }
])
const paramOpOptions = computed(() => [
  { value: 'eq', label: t('prices.visual.op.eq') },
  { value: 'contains', label: t('prices.visual.op.contains') }
])
</script>

<template>
  <div class="space-y-6">
    <!-- tiers -->
    <section>
      <div class="mb-2 flex items-center justify-between">
        <div>
          <SSectionTitle tag="h4" class="!mb-0">{{ t('prices.visual.tiers') }}</SSectionTitle>
          <SHint size="xs">{{ t('prices.visual.tiersHint') }}</SHint>
        </div>
        <SButton size="sm" :disabled="disabled" @click="addTier">+ {{ t('prices.visual.addTier') }}</SButton>
      </div>
      <div class="space-y-3">
        <div
          v-for="(tier, i) in model.tiers"
          :key="i"
          class="rounded-xl border border-gray-200 p-3 dark:border-dark-700"
        >
          <div class="mb-2 flex flex-wrap items-center gap-3">
            <label class="flex items-center gap-2 text-sm">
              <SHint inline>{{ t('prices.visual.tierName') }}</SHint>
              <SInput v-model.trim="tier.name" class="!w-40 !py-1.5" mono :disabled="disabled" />
            </label>
            <label v-if="i < model.tiers.length - 1" class="flex items-center gap-2 text-sm">
              <SHint inline>{{ t('prices.visual.condLen') }}</SHint>
              <SInput v-model.number="tier.max_len" type="number" min="1" class="!w-36 !py-1.5" :disabled="disabled" />
            </label>
            <SHint v-else inline>{{ model.tiers.length > 1 ? t('prices.visual.otherwise') : t('prices.visual.always') }}</SHint>
            <SButton
              v-if="model.tiers.length > 1"
              variant="ghost"
              size="sm"
              class="ml-auto"
              :disabled="disabled"
              @click="removeTier(i)"
            >
              ×
            </SButton>
          </div>
          <SGrid :cols-base="2" :cols="3" :lg-cols="6" :gap="2">
            <label v-for="k in priceKeys" :key="k" class="text-xs">
              <SHint inline size="xs">{{ t(`prices.vars.${k}`) }}</SHint>
              <SInput
                v-model.number="tier[k]"
                type="number"
                min="0"
                step="any"
                class="mt-1 !py-1.5"
                :placeholder="unsettable(k) ? t('prices.unsetPlaceholder') : '0'"
                :disabled="disabled"
              />
            </label>
          </SGrid>
        </div>
      </div>
    </section>

    <!-- markup rules -->
    <section>
      <div class="mb-2 flex items-center justify-between">
        <div>
          <SSectionTitle tag="h4" class="!mb-0">{{ t('prices.visual.rules') }}</SSectionTitle>
          <SHint size="xs">{{ t('prices.visual.rulesHint') }}</SHint>
        </div>
        <SButton size="sm" :disabled="disabled" @click="addRule">+ {{ t('prices.visual.addRule') }}</SButton>
      </div>
      <SHint v-if="!model.rules.length">{{ t('prices.visual.noRules') }}</SHint>
      <div class="space-y-2">
        <div v-for="(r, i) in model.rules" :key="i" class="flex flex-wrap items-center gap-2 text-sm">
          <SHint inline>{{ t('prices.visual.when') }}</SHint>
          <SSelect class="!w-28 !py-1.5" :model-value="r.kind" :options="kindOptions" :disabled="disabled" @update:model-value="setKind(i, $event as MarkupRule['kind'])" />
          <template v-if="r.kind === 'header'">
            <SInput v-model="r.name" class="!w-44 !py-1.5" mono :placeholder="t('prices.visual.headerName')" :disabled="disabled" />
            <SSelect v-model="r.op" class="!w-28 !py-1.5" :options="headerOpOptions" :disabled="disabled" />
            <SInput v-model="r.value" class="!w-40 !py-1.5" mono :placeholder="t('prices.visual.value')" :disabled="disabled" />
          </template>
          <template v-else-if="r.kind === 'param'">
            <SInput v-model="r.path" class="!w-44 !py-1.5" mono :placeholder="t('prices.visual.paramPath')" :disabled="disabled" />
            <SSelect v-model="r.op" class="!w-28 !py-1.5" :options="paramOpOptions" :disabled="disabled" />
            <SInput v-model="r.value" class="!w-40 !py-1.5" mono :placeholder="t('prices.visual.value')" :disabled="disabled" />
          </template>
          <template v-else>
            <SInput v-model="r.tz" class="!w-44 !py-1.5" mono :placeholder="t('prices.visual.tz')" :disabled="disabled" />
            <SSelect v-model.number="r.from_hour" class="!w-24 !py-1.5" :options="hourOptions.slice(0, 24)" :disabled="disabled" />
            <SHint inline>~</SHint>
            <SSelect v-model.number="r.to_hour" class="!w-24 !py-1.5" :options="hourOptions.slice(1)" :disabled="disabled" />
          </template>
          <SHint inline class="ml-2">{{ t('prices.visual.multiplier') }}</SHint>
          <SInput v-model.number="r.multiplier" type="number" min="0" step="any" class="!w-24 !py-1.5" :disabled="disabled" />
          <SButton variant="ghost" size="sm" :disabled="disabled" @click="model.rules.splice(i, 1)">×</SButton>
        </div>
      </div>
    </section>
  </div>
</template>
