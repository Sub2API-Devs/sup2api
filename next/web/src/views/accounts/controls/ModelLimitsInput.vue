<script setup lang="ts">
// The model limits editor (CONTRACTS §68) with the account API's shape: the
// v-model is `model_limits` (one entry per model list). The cards stay local,
// so a card still being filled in (an empty list) is not lost on the way
// through the saved shape; an outside change of the value reloads them.
import { ref, watch } from 'vue'
import type { ModelLimit } from '@/api/types'
import ModelLimitsEditor from '../ModelLimitsEditor.vue'
import { fromCards, toCards, type ModelLimitCard } from '../modelLimits'

const model = defineModel<ModelLimit[]>({ required: true })
withDefaults(defineProps<{ options?: string[]; errors?: Record<string, string>; disabled?: boolean }>(), {
  options: () => [],
  errors: () => ({})
})

const cards = ref<ModelLimitCard[]>([])
/** JSON of the value last read or emitted: our own echo does not reload the cards. */
let current = ''

watch(
  model,
  v => {
    if (JSON.stringify(v ?? []) === current) return
    current = JSON.stringify(v ?? [])
    cards.value = toCards(v)
  },
  { immediate: true }
)
watch(
  cards,
  c => {
    const v = fromCards(c)
    if (JSON.stringify(v) === current) return
    current = JSON.stringify(v)
    model.value = v
  },
  { deep: true }
)
</script>

<template>
  <ModelLimitsEditor v-model="cards" :options="options" :errors="errors" :disabled="disabled" />
</template>
