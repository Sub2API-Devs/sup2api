<script setup lang="ts">
import { computed } from 'vue'
import { SButton, SField, SHint, SInput, SSectionTitle, SSelect, SSwitch } from '@sub2api/ui'
import RulesEditor from './RulesEditor.vue'
import StrategiesEditor from './StrategiesEditor.vue'
import { clone, enumOptions, useDwHost, type Layer } from './host'

// One configuration layer (the global one or a group's): window, sample
// floor, exempt status codes, weight floor, rules and strategies.
const props = defineProps<{ defaults: Layer | null; master?: boolean }>()
const layer = defineModel<Layer>({ required: true })
const t = useDwHost().t

const floorOptions = computed(() => enumOptions('floor', ['base_percent', 'fixed']))
const ruleNames = computed(() => layer.value.rules.map((r) => r.name))

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
      <SField class="dw-w-8" :label="t('layer.window')" :hint="t('layer.windowHint')">
        <SInput v-model="layer.window_seconds" type="number" min="3" max="3600">
          <template #suffix>s</template>
        </SInput>
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
        <SInput v-model="layer.min_weight" type="number" min="0">
          <template v-if="layer.min_weight_mode === 'base_percent'" #suffix>%</template>
        </SInput>
      </SField>
    </div>

    <SSectionTitle :title="t('layer.rules')">
      <template #actions>
        <SButton size="sm" :disabled="!defaults" @click="restoreRules">{{ t('layer.restoreRules') }}</SButton>
      </template>
    </SSectionTitle>
    <SHint class="dw-hint">{{ t('layer.rulesHint') }}</SHint>
    <RulesEditor v-model="layer.rules" />

    <SSectionTitle :title="t('layer.strategies')" />
    <SHint class="dw-hint">{{ t('layer.strategiesHint') }}</SHint>
    <StrategiesEditor v-model="layer.strategies" :rules="ruleNames" />
  </div>
</template>
