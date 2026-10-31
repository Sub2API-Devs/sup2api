<script setup lang="ts">
import { computed } from 'vue'
import { SButton, SField, SInput, SSelect, SSwitch } from '@sub2api/ui'
import ItemActions from './ItemActions.vue'
import { duplicateItem, enumOptions, metrics, moveItem, opsOf, percentileMetric, useDwHost, type Condition, type Metric, type Rule } from './host'

// Judgement rules: conditions joined by and / or ("and" binds first), judged
// per window; a rule fires once it hit in M of the last N windows. A name
// change is committed on blur and reported so strategies can follow it. The
// order is the order of the rule slots (and of the status page). An emptied
// number is marked here; LayerEditor names the rule and blocks saving.
const rules = defineModel<Rule[]>({ required: true })
const emit = defineEmits<{ (e: 'rename', from: string, to: string): void }>()
const t = useDwHost().t

const scopeOptions = computed(() => enumOptions('scope', ['all', 'stream', 'non_stream']))
const metricOptions = computed(() => enumOptions('metric', metrics))
const joinOptions = computed(() => enumOptions('join', ['and', 'or']))
const opOptions = (m: Metric) => enumOptions('op', opsOf(m))

function setMetric(c: Condition, m: Metric) {
  c.metric = m
  c.p = percentileMetric(m) ? (c.p ?? 95) : undefined
  if (!opsOf(m).includes(c.op)) c.op = 'gte'
}

const newCondition = (): Condition => ({ join: 'and', metric: 'error_rate', op: 'gte', value: 30 })

function add() {
  rules.value.push({ name: t('rules.newName', { n: rules.value.length + 1 }), conditions: [{ ...newCondition(), join: undefined }], periods: 1, hit_periods: 1 })
}

function rename(r: Rule, name: string) {
  const from = r.name
  r.name = name
  emit('rename', from, name)
}

const copyName = (name: string, n: number) => t('item.copyName', { name, n })

function removeCondition(r: Rule, i: number) {
  r.conditions.splice(i, 1)
  if (r.conditions[0]) r.conditions[0].join = undefined
}
</script>

<template>
  <div class="dw-list">
    <div v-for="(r, i) in rules" :key="i" class="dw-item">
      <div class="dw-row">
        <SField class="dw-grow" :label="t('rules.name')">
          <SInput :model-value="r.name" :maxlength="64" lazy @update:model-value="rename(r, String($event))" />
        </SField>
        <SField class="dw-w-10" :label="t('rules.scope')">
          <SSelect :model-value="r.scope || 'all'" :options="scopeOptions" @update:model-value="r.scope = $event as Rule['scope']" />
        </SField>
        <SField class="dw-w-6" :label="t('rules.periods')" :hint="t('rules.periodsHint')">
          <SInput v-model="r.periods" type="number" min="1" max="60" :error="r.periods == null" />
        </SField>
        <SField class="dw-w-6" :label="t('rules.hitPeriods')">
          <SInput v-model="r.hit_periods" type="number" min="1" :max="r.periods" :error="r.hit_periods == null" />
        </SField>
        <SField :label="t('enabled')">
          <SSwitch :model-value="r.enabled !== false" @update:model-value="r.enabled = $event ? undefined : false" />
        </SField>
        <ItemActions :index="i" :count="rules.length" @move="moveItem(rules, i, $event)" @duplicate="duplicateItem(rules, i, copyName)" @remove="rules.splice(i, 1)" />
      </div>

      <div v-for="(c, j) in r.conditions" :key="j" class="dw-row dw-cond">
        <SSelect v-if="j > 0" class="dw-w-6" :model-value="c.join ?? 'and'" :options="joinOptions" @update:model-value="c.join = $event as Condition['join']" />
        <span v-else class="dw-w-6 dw-sub">{{ t('rules.if') }}</span>
        <SSelect class="dw-w-10" :model-value="c.metric" :options="metricOptions" @update:model-value="setMetric(c, $event as Metric)" />
        <SInput v-if="percentileMetric(c.metric)" v-model="c.p" class="dw-w-6" type="number" min="50" max="100" :error="c.p == null" :aria-label="t('rules.p')">
          <template #prefix>{{ t('rules.pPrefix') }}</template>
        </SInput>
        <SSelect class="dw-w-6" v-model="c.op" :options="opOptions(c.metric)" />
        <SInput v-model="c.value" class="dw-w-8" type="number" min="0" :error="c.value == null" :aria-label="t('rules.value')" :suffix="t(`unit.${c.metric}`)" />
        <SButton size="sm" variant="ghost" icon="x" icon-only :aria-label="t('remove')" :disabled="r.conditions.length <= 1" @click="removeCondition(r, j)" />
      </div>
      <SButton size="xs" icon="plus" :disabled="r.conditions.length >= 10" @click="r.conditions.push(newCondition())">{{ t('rules.addCondition') }}</SButton>
    </div>
    <SButton icon="plus" :disabled="rules.length >= 20" @click="add">{{ t('rules.add') }}</SButton>
  </div>
</template>
