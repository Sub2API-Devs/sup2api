<script setup lang="ts">
import { computed } from 'vue'
import { SField, SInput, SSettingRow, SSwitch } from '@sub2api/ui'
import ConfigFloorInput from './ConfigFloorInput.vue'
import { useDwHost, type Layer } from './host'

// The scalar fields of a layer (the global one or a group's), in the two
// groups of the page: counting and judging, and the weight floor. Hints sit
// under the inputs, so labels stay on one line across the columns.
defineProps<{ readonly?: boolean }>()
const layer = defineModel<Layer>({ required: true })
const t = useDwHost().t
const required = (v: number | null | undefined) => (v === null || v === undefined ? t('layer.required') : undefined)
const floor = computed({
  get: () => ({ mode: layer.value.min_weight_mode, value: layer.value.min_weight }),
  set: v => {
    layer.value.min_weight_mode = v.mode
    layer.value.min_weight = v.value as number
  }
})
</script>

<template>
  <fieldset class="dw-fieldset dw-cfg-fields" :disabled="readonly">
    <h4 class="dw-cfg-group-title">{{ t('cfg.field.stats') }}</h4>
    <div class="dw-cfg-grid">
      <SField :label="t('layer.window')" :hint="t('layer.windowHint')" :error="required(layer.window_seconds)">
        <SInput v-model="layer.window_seconds" type="number" min="10" max="3600" :suffix="t('unit.second')" :disabled="readonly" />
      </SField>
      <SField :label="t('layer.minSamples')" :hint="t('layer.minSamplesHint')" :error="required(layer.min_samples)">
        <SInput v-model="layer.min_samples" type="number" min="1" :suffix="t('cfg.field.samplesUnit')" :disabled="readonly" />
      </SField>
      <SField :label="t('layer.exempt')" :hint="t('layer.exemptHint')">
        <SInput v-model="layer.exempt_status_codes" placeholder="400,500-503" :disabled="readonly" />
      </SField>
    </div>
    <SSettingRow flush dense :label="t('layer.strict')" :description="t('layer.strictHint')">
      <SSwitch v-model="layer.min_samples_strict" :disabled="readonly" />
    </SSettingRow>

    <h4 class="dw-cfg-group-title">{{ t('cfg.field.floor') }}</h4>
    <div class="dw-cfg-grid">
      <SField :label="t('layer.floor')" :hint="t('layer.floorHint')" :error="required(layer.min_weight)">
        <ConfigFloorInput v-model="floor" :disabled="readonly" :aria-label="t('layer.floor')" />
      </SField>
    </div>
    <SSettingRow flush dense :label="t('layer.clearOnZero')" :description="t('layer.clearOnZeroHint')">
      <SSwitch v-model="layer.clear_sticky_on_zero" :disabled="readonly" />
    </SSettingRow>
  </fieldset>
</template>
