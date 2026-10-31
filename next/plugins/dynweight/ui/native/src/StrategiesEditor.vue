<script setup lang="ts">
import { computed } from 'vue'
import { SButton, SField, SInput, SSelect, SSwitch } from '@sub2api/ui'
import WhenEditor from './WhenEditor.vue'
import { enumOptions, useDwHost, type Action, type ActionType, type Strategy } from './host'

// Strategies: when the referenced rules fire, degrade or climb the weight
// and / or clear part of the sticky sessions on the account.
const props = defineProps<{ rules: string[] }>()
const strategies = defineModel<Strategy[]>({ required: true })
const t = useDwHost().t

const modeOptions = computed(() => enumOptions('mode', ['current_percent', 'base_percent', 'fixed']))

const actionTypes: readonly ActionType[] = ['weight_degrade', 'weight_climb', 'affinity_clear']
const isWeight = (a: Action) => a.type !== 'affinity_clear'

/** Types an action may take beside the strategy's others, as the plugin
 * accepts: no type twice, and one weight action at most. */
function freeTypes(s: Strategy, self?: Action): ActionType[] {
  const others = s.actions.filter((a) => a !== self)
  return actionTypes.filter((ty) => (ty === 'affinity_clear' ? !others.some((a) => a.type === ty) : !others.some(isWeight)))
}
const typeOptions = (s: Strategy, a: Action) => enumOptions('action', freeTypes(s, a))

function setType(a: Action, type: ActionType) {
  a.type = type
  if (isWeight(a)) Object.assign(a, { mode: a.mode ?? 'current_percent', value: a.value ?? 30, percent: undefined })
  else Object.assign(a, { mode: undefined, value: undefined, percent: a.percent ?? 50 })
}

function addAction(s: Strategy) {
  const a: Action = { type: freeTypes(s)[0] }
  setType(a, a.type)
  s.actions.push(a)
}

function add() {
  strategies.value.push({
    name: t('strategies.newName', { n: strategies.value.length + 1 }),
    when: props.rules[0] ?? '',
    actions: [{ type: 'weight_degrade', mode: 'current_percent', value: 30 }]
  })
}
</script>

<template>
  <div class="dw-list">
    <div v-for="(s, i) in strategies" :key="i" class="dw-item">
      <div class="dw-row">
        <SField class="dw-grow" :label="t('strategies.name')">
          <SInput v-model="s.name" :maxlength="64" />
        </SField>
        <SField class="dw-w-8" :label="t('strategies.cooldown')" :hint="t('strategies.cooldownHint')">
          <SInput :model-value="s.cooldown_seconds ?? 0" type="number" min="0" @update:model-value="s.cooldown_seconds = Number($event) || undefined" />
        </SField>
        <SField :label="t('enabled')">
          <SSwitch :model-value="s.enabled !== false" @update:model-value="s.enabled = $event ? undefined : false" />
        </SField>
        <SButton class="dw-end" size="sm" variant="ghost" icon="trash" icon-only :aria-label="t('remove')" @click="strategies.splice(i, 1)" />
      </div>
      <SField :label="t('strategies.when')">
        <WhenEditor v-model="s.when" :rules="rules" />
      </SField>
      <SField :label="t('strategies.actions')">
        <div class="dw-list">
          <div v-for="(a, j) in s.actions" :key="j" class="dw-row">
            <SSelect class="dw-w-10" :model-value="a.type" :options="typeOptions(s, a)" @update:model-value="setType(a, $event as ActionType)" />
            <template v-if="isWeight(a)">
              <SSelect v-model="a.mode" class="dw-w-10" :options="modeOptions" />
              <SInput v-model="a.value" class="dw-w-8" type="number" min="1" :aria-label="t('strategies.value')" :suffix="a.mode === 'fixed' ? '' : '%'" />
            </template>
            <SInput v-else v-model="a.percent" class="dw-w-8" type="number" min="1" max="100" :aria-label="t('strategies.percent')" suffix="%" />
            <SButton size="sm" variant="ghost" icon="x" icon-only :aria-label="t('remove')" :disabled="s.actions.length <= 1" @click="s.actions.splice(j, 1)" />
          </div>
          <div>
            <SButton size="xs" icon="plus" :disabled="!freeTypes(s).length" @click="addAction(s)">{{ t('strategies.addAction') }}</SButton>
          </div>
        </div>
      </SField>
    </div>
    <SButton icon="plus" :disabled="strategies.length >= 20" @click="add">{{ t('strategies.add') }}</SButton>
  </div>
</template>
