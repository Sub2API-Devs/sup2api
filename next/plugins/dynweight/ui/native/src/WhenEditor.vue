<script setup lang="ts">
import { computed } from 'vue'
import { SButton, SSelect } from '@sub2api/ui'
import { enumOptions, useDwHost, type When } from './host'

// A strategy's trigger: one rule, or all / any of several, where a member may
// itself be all / any of rules (one level of nesting, as the plugin accepts).
// A member is a nested editor: a rule, or a group that cannot switch to a rule
// nor add groups of its own.
const props = withDefaults(defineProps<{ rules: string[]; nested?: boolean }>(), { nested: false })
const when = defineModel<When | null>({ required: true })
const t = useDwHost().t

type Kind = 'rule' | 'all' | 'any'
const kind = computed<Kind>(() => (when.value && typeof when.value === 'object' ? ('all' in when.value ? 'all' : 'any') : 'rule'))
const members = computed<When[]>(() => {
  const w = when.value
  if (!w || typeof w !== 'object') return []
  return 'all' in w ? w.all : w.any
})

const ruleOptions = computed(() => props.rules.map((r) => ({ value: r, label: r })))
const kindOptions = computed(() => enumOptions('when', props.nested ? ['all', 'any'] : ['rule', 'all', 'any']))

const firstRule = () => props.rules[0] ?? ''
const wrap = (k: Kind, list: When[]): When => (k === 'all' ? { all: list } : { any: list })

function setKind(k: Kind) {
  if (k === kind.value) return
  if (k === 'rule') when.value = members.value.find((m) => typeof m === 'string') ?? firstRule()
  else when.value = wrap(k, kind.value === 'rule' ? [when.value ?? firstRule()] : members.value)
}

function setMember(i: number, m: When | null) {
  when.value = wrap(kind.value, members.value.map((x, j) => (j === i ? (m ?? firstRule()) : x)))
}

function addMember(group: boolean) {
  when.value = wrap(kind.value, [...members.value, group ? { any: [firstRule()] } : firstRule()])
}

function removeMember(i: number) {
  when.value = wrap(kind.value, members.value.filter((_, j) => j !== i))
}
</script>

<template>
  <div class="dw-when">
    <div class="dw-row">
      <SSelect v-if="!nested || kind !== 'rule'" class="dw-w-8" :model-value="kind" :options="kindOptions" @update:model-value="setKind($event as Kind)" />
      <SSelect v-if="kind === 'rule'" class="dw-grow" :model-value="(when as string) ?? ''" :options="ruleOptions" @update:model-value="when = $event as string" />
    </div>
    <div v-if="kind !== 'rule'" class="dw-when-members">
      <div v-for="(m, i) in members" :key="i" class="dw-row">
        <WhenEditor class="dw-grow" :model-value="m" :rules="rules" nested @update:model-value="setMember(i, $event)" />
        <SButton size="sm" variant="ghost" icon="trash" icon-only :aria-label="t('remove')" :disabled="members.length <= 1" @click="removeMember(i)" />
      </div>
      <div class="dw-row">
        <SButton size="xs" icon="plus" @click="addMember(false)">{{ t('when.addRule') }}</SButton>
        <SButton v-if="!nested" size="xs" icon="plus" @click="addMember(true)">{{ t('when.addGroup') }}</SButton>
      </div>
    </div>
  </div>
</template>
