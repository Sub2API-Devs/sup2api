<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watchEffect } from 'vue'
import { SAlert, SButton, SField, SHint, SInput, SSectionTitle, SSegmented, SSelect, SSwitch } from '@sub2api/ui'
import ItemsJsonPanel from './ItemsJsonPanel.vue'
import RulesEditor from './RulesEditor.vue'
import StrategiesEditor from './StrategiesEditor.vue'
import { clone, enumOptions, rulesWithEmptyNumbers, strategiesWithEmptyNumbers, useDwHost, type Layer, type When } from './host'

// One configuration layer (the global one or a group's): window, sample
// floor and whether it is strict, exempt status codes, weight floor, the
// sticky clearing at 0, rules and strategies.
const props = defineProps<{ defaults: Layer | null; master?: boolean }>()
const layer = defineModel<Layer>({ required: true })
// Set while the JSON panel holds text that does not parse: that text is not
// in the layer. Empty numbers are in the layer, so ConfigTab finds them from
// the draft itself, also while this editor is collapsed (unmounted).
const invalid = defineModel<boolean>('invalid', { default: false })
const t = useDwHost().t
const jsonInvalid = ref(false)
const required = (v: number | null) => (v === null || v === undefined ? t('layer.required') : undefined)
const emptyRules = computed(() => rulesWithEmptyNumbers(layer.value.rules))
const emptyStrategies = computed(() => strategiesWithEmptyNumbers(layer.value.strategies))
watchEffect(() => (invalid.value = jsonInvalid.value))
// The unparsed text goes with the editor.
onBeforeUnmount(() => (invalid.value = false))

const floorOptions = computed(() => enumOptions('floor', ['base_percent', 'fixed']))
// Rules and strategies are edited visually or as JSON.
const mode = ref<'visual' | 'json'>('visual')
const modeOptions = computed(() => enumOptions('editMode', ['visual', 'json']))
const ruleNames = computed(() => layer.value.rules.map((r) => r.name))

/** Rule names a trigger references. */
const refsOf = (w: When | null): string[] => (w === null ? [] : typeof w === 'string' ? [w] : ('all' in w ? w.all : w.any).flatMap(refsOf))

/** The trigger with rule `from` renamed `to`. */
function renamed(w: When, from: string, to: string): When {
  if (typeof w === 'string') return w === from ? to : w
  const each = (list: When[]) => list.map((m) => renamed(m, from, to))
  return 'all' in w ? { all: each(w.all) } : { any: each(w.any) }
}

// Strategies follow a rename only when it is unambiguous: no other rule still
// has the old name (its strategies stay with it), and no other rule had the
// new one already (renaming a copy onto a name and away again must not take
// that rule's strategies along).
function renameRule(from: string, to: string) {
  const names = layer.value.rules.map((r) => r.name)
  if (from === to || names.includes(from) || names.filter((n) => n === to).length > 1) return
  for (const s of layer.value.strategies) if (s.when !== null) s.when = renamed(s.when, from, to)
}

// Strategies the plugin refuses to save: an enabled one referencing a removed
// or disabled rule, a disabled one referencing a removed rule.
const staleStrategies = computed(() => {
  const all = new Set(layer.value.rules.map((r) => r.name))
  const live = new Set(layer.value.rules.filter((r) => r.enabled !== false).map((r) => r.name))
  return layer.value.strategies.filter((s) => refsOf(s.when).some((r) => !(s.enabled !== false ? live : all).has(r))).map((s) => s.name)
})

function restoreRules() {
  if (!props.defaults) return
  layer.value.rules = clone(props.defaults.rules)
  layer.value.strategies = clone(props.defaults.strategies)
}
</script>

<template>
  <div class="dw-layer">
    <div class="dw-row">
      <SField :label="t(master ? 'layer.master' : 'layer.enabled')" :hint="t(master ? 'layer.masterHint' : 'layer.enabledHint')">
        <SSwitch v-model="layer.enabled" />
      </SField>
    </div>
    <div class="dw-row">
      <SField class="dw-w-8" :label="t('layer.window')" :hint="t('layer.windowHint')" :error="required(layer.window_seconds)">
        <SInput v-model="layer.window_seconds" type="number" min="10" max="3600" :suffix="t('unit.second')" />
      </SField>
      <SField class="dw-w-8" :label="t('layer.minSamples')" :hint="t('layer.minSamplesHint')" :error="required(layer.min_samples)">
        <SInput v-model="layer.min_samples" type="number" min="1" />
      </SField>
      <SField class="dw-grow" :label="t('layer.exempt')" :hint="t('layer.exemptHint')">
        <SInput v-model="layer.exempt_status_codes" placeholder="400,500-503" />
      </SField>
      <SField class="dw-w-10" :label="t('layer.floorMode')">
        <SSelect v-model="layer.min_weight_mode" :options="floorOptions" />
      </SField>
      <SField class="dw-w-8" :label="t('layer.floor')" :hint="t('layer.floorHint')" :error="required(layer.min_weight)">
        <SInput v-model="layer.min_weight" type="number" min="0" :suffix="layer.min_weight_mode === 'base_percent' ? '%' : ''" />
      </SField>
    </div>
    <div class="dw-row">
      <SField :label="t('layer.strict')" :hint="t('layer.strictHint')">
        <SSwitch v-model="layer.min_samples_strict" />
      </SField>
      <SField :label="t('layer.clearOnZero')" :hint="t('layer.clearOnZeroHint')">
        <SSwitch v-model="layer.clear_sticky_on_zero" />
      </SField>
    </div>

    <SSectionTitle :title="t('layer.rules')">
      <template #actions>
        <SSegmented :model-value="mode" :options="modeOptions" size="sm" @update:model-value="mode = $event as 'visual' | 'json'" />
        <SButton size="sm" :disabled="!defaults" @click="restoreRules">{{ t('layer.restoreRules') }}</SButton>
      </template>
    </SSectionTitle>
    <SHint class="dw-hint">{{ t('layer.rulesHint') }}</SHint>
    <SAlert v-if="staleStrategies.length" tone="warning" class="dw-block">{{ t('layer.staleRefs', { names: staleStrategies.join(', ') }) }}</SAlert>
    <SAlert v-if="emptyRules.length" tone="danger" class="dw-block">{{ t('layer.emptyNumbers', { names: emptyRules.join(', ') }) }}</SAlert>
    <SAlert v-if="emptyStrategies.length" tone="danger" class="dw-block">{{ t('layer.emptyStrategyNumbers', { names: emptyStrategies.join(', ') }) }}</SAlert>
    <ItemsJsonPanel v-if="mode === 'json'" v-model="layer" v-model:invalid="jsonInvalid" />
    <template v-else>
      <RulesEditor v-model="layer.rules" @rename="renameRule" />
      <SSectionTitle :title="t('layer.strategies')" />
      <SHint class="dw-hint">{{ t('layer.strategiesHint') }}</SHint>
      <StrategiesEditor v-model="layer.strategies" :rules="ruleNames" />
    </template>
  </div>
</template>
