<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { SButton } from '@sub2api/ui'
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
</script>

<template>
  <div class="space-y-6">
    <!-- tiers -->
    <section>
      <div class="mb-2 flex items-center justify-between">
        <div>
          <h4 class="section-title !mb-0">{{ t('prices.visual.tiers') }}</h4>
          <p class="muted text-xs">{{ t('prices.visual.tiersHint') }}</p>
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
              <span class="muted">{{ t('prices.visual.tierName') }}</span>
              <input v-model.trim="tier.name" class="input !w-40 !py-1.5 font-mono" :disabled="disabled" />
            </label>
            <label v-if="i < model.tiers.length - 1" class="flex items-center gap-2 text-sm">
              <span class="muted">{{ t('prices.visual.condLen') }}</span>
              <input v-model.number="tier.max_len" type="number" min="1" class="input !w-36 !py-1.5" :disabled="disabled" />
            </label>
            <span v-else class="muted text-sm">{{ model.tiers.length > 1 ? t('prices.visual.otherwise') : t('prices.visual.always') }}</span>
            <button
              v-if="model.tiers.length > 1"
              type="button"
              class="btn btn-ghost btn-sm ml-auto"
              :disabled="disabled"
              @click="removeTier(i)"
            >
              ×
            </button>
          </div>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <label v-for="k in priceKeys" :key="k" class="text-xs">
              <span class="muted">{{ t(`prices.vars.${k}`) }}</span>
              <input
                v-model.number="tier[k]"
                type="number"
                min="0"
                step="any"
                class="input mt-1 !py-1.5"
                :placeholder="unsettable(k) ? t('prices.unsetPlaceholder') : '0'"
                :disabled="disabled"
              />
            </label>
          </div>
        </div>
      </div>
    </section>

    <!-- markup rules -->
    <section>
      <div class="mb-2 flex items-center justify-between">
        <div>
          <h4 class="section-title !mb-0">{{ t('prices.visual.rules') }}</h4>
          <p class="muted text-xs">{{ t('prices.visual.rulesHint') }}</p>
        </div>
        <SButton size="sm" :disabled="disabled" @click="addRule">+ {{ t('prices.visual.addRule') }}</SButton>
      </div>
      <p v-if="!model.rules.length" class="muted text-sm">{{ t('prices.visual.noRules') }}</p>
      <div class="space-y-2">
        <div v-for="(r, i) in model.rules" :key="i" class="flex flex-wrap items-center gap-2 text-sm">
          <span class="muted">{{ t('prices.visual.when') }}</span>
          <select class="input !w-28 !py-1.5" :value="r.kind" :disabled="disabled" @change="setKind(i, ($event.target as HTMLSelectElement).value as MarkupRule['kind'])">
            <option value="header">{{ t('prices.visual.kind.header') }}</option>
            <option value="param">{{ t('prices.visual.kind.param') }}</option>
            <option value="time">{{ t('prices.visual.kind.time') }}</option>
          </select>
          <template v-if="r.kind === 'header'">
            <input v-model="r.name" class="input !w-44 !py-1.5 font-mono" :placeholder="t('prices.visual.headerName')" :disabled="disabled" />
            <select v-model="r.op" class="input !w-28 !py-1.5" :disabled="disabled">
              <option value="contains">{{ t('prices.visual.op.contains') }}</option>
              <option value="eq">{{ t('prices.visual.op.eq') }}</option>
            </select>
            <input v-model="r.value" class="input !w-40 !py-1.5 font-mono" :placeholder="t('prices.visual.value')" :disabled="disabled" />
          </template>
          <template v-else-if="r.kind === 'param'">
            <input v-model="r.path" class="input !w-44 !py-1.5 font-mono" :placeholder="t('prices.visual.paramPath')" :disabled="disabled" />
            <select v-model="r.op" class="input !w-28 !py-1.5" :disabled="disabled">
              <option value="eq">{{ t('prices.visual.op.eq') }}</option>
              <option value="contains">{{ t('prices.visual.op.contains') }}</option>
            </select>
            <input v-model="r.value" class="input !w-40 !py-1.5 font-mono" :placeholder="t('prices.visual.value')" :disabled="disabled" />
          </template>
          <template v-else>
            <input v-model="r.tz" class="input !w-44 !py-1.5 font-mono" :placeholder="t('prices.visual.tz')" :disabled="disabled" />
            <select v-model.number="r.from_hour" class="input !w-24 !py-1.5" :disabled="disabled">
              <option v-for="h in hours.slice(0, 24)" :key="h" :value="h">{{ t('prices.visual.hour', { h }) }}</option>
            </select>
            <span class="muted">~</span>
            <select v-model.number="r.to_hour" class="input !w-24 !py-1.5" :disabled="disabled">
              <option v-for="h in hours.slice(1)" :key="h" :value="h">{{ t('prices.visual.hour', { h }) }}</option>
            </select>
          </template>
          <span class="muted ml-2">{{ t('prices.visual.multiplier') }}</span>
          <input v-model.number="r.multiplier" type="number" min="0" step="any" class="input !w-24 !py-1.5" :disabled="disabled" />
          <button type="button" class="btn btn-ghost btn-sm" :disabled="disabled" @click="model.rules.splice(i, 1)">×</button>
        </div>
      </div>
    </section>
  </div>
</template>
