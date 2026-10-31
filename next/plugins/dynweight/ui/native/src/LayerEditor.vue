<script setup lang="ts">
import { computed, ref } from 'vue'
import { SAlert, SButton, SField, SHint, SInput, SSectionTitle, SSegmented, SSelect, SSwitch } from '@sub2api/ui'
import ItemsJsonPanel from './ItemsJsonPanel.vue'
import RulesEditor from './RulesEditor.vue'
import StrategiesEditor from './StrategiesEditor.vue'
import { clone, enumOptions, useDwHost, type Layer, type When } from './host'

// One configuration layer (the global one or a group's): window, sample
// floor, exempt status codes, weight floor, rules and strategies.
const props = defineProps<{ defaults: Layer | null; master?: boolean }>()
const layer = defineModel<Layer>({ required: true })
const t = useDwHost().t

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

function renameRule(from: string, to: string) {
  for (const s of layer.value.strategies) if (s.when !== null) s.when = renamed(s.when, from, to)
}

// Enabled strategies referencing a removed or disabled rule, which the plugin
// refuses to save.
const staleStrategies = computed(() => {
  const live = new Set(layer.value.rules.filter((r) => r.enabled !== false).map((r) => r.name))
  return layer.value.strategies.filter((s) => s.enabled !== false && refsOf(s.when).some((r) => !live.has(r))).map((s) => s.name)
})

const restored = ref(0)
function restoreRules() {
  if (!props.defaults) return
  layer.value.rules = clone(props.defaults.rules)
  layer.value.strategies = clone(props.defaults.strategies)
  restored.value++
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
      <SField class="dw-w-8" :label="t('layer.window')" :hint="t('layer.windowHint')">
        <SInput v-model="layer.window_seconds" type="number" min="10" max="3600" :suffix="t('unit.second')" />
      </SField>
      <SField class="dw-w-8" :label="t('layer.minSamples')" :hint="t('layer.minSamplesHint')">
        <SInput v-model="layer.min_samples" type="number" min="1" />
      </SField>
      <SField class="dw-grow" :label="t('layer.exempt')" :hint="t('layer.exemptHint')">
        <SInput v-model="layer.exempt_status_codes" placeholder="400,500-503" />
      </SField>
      <SField class="dw-w-10" :label="t('layer.floorMode')">
        <SSelect v-model="layer.min_weight_mode" :options="floorOptions" />
      </SField>
      <SField class="dw-w-8" :label="t('layer.floor')" :hint="t('layer.floorHint')">
        <SInput v-model="layer.min_weight" type="number" min="0" :suffix="layer.min_weight_mode === 'base_percent' ? '%' : ''" />
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
    <!-- Restoring the defaults remounts the JSON panel with the new text. -->
    <ItemsJsonPanel v-if="mode === 'json'" :key="restored" v-model="layer" />
    <template v-else>
      <RulesEditor v-model="layer.rules" @rename="renameRule" />
      <SSectionTitle :title="t('layer.strategies')" />
      <SHint class="dw-hint">{{ t('layer.strategiesHint') }}</SHint>
      <StrategiesEditor v-model="layer.strategies" :rules="ruleNames" />
    </template>
  </div>
</template>
