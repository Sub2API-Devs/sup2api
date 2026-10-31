<script setup lang="ts">
import { computed } from 'vue'
import { SButton, SSelect } from '@sub2api/ui'
import { useDwHost, type When } from './host'

// A strategy's trigger: one rule, or all / any of several, where a member may
// itself be all / any of rules (one level of nesting, as the plugin accepts).
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
const kindOptions = computed(() => (['rule', 'all', 'any'] as const).map((k) => ({ value: k, label: t(`when.${k}`) })))

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
      <SSelect v-if="!nested" class="dw-w-8" :model-value="kind" :options="kindOptions" @update:model-value="setKind($event as Kind)" />
      <SSelect v-if="kind === 'rule'" class="dw-grow" :model-value="(when as string) ?? ''" :options="ruleOptions" @update:model-value="when = $event as string" />
    </div>
    <div v-if="kind !== 'rule'" class="dw-when-members">
      <div v-for="(m, i) in members" :key="i" class="dw-row">
        <SSelect v-if="typeof m === 'string'" class="dw-grow" :model-value="m" :options="ruleOptions" @update:model-value="setMember(i, $event as string)" />
        <div v-else class="dw-grow dw-when-nested">
          <SSelect class="dw-w-8" :model-value="'all' in m ? 'all' : 'any'" :options="kindOptions.slice(1)" @update:model-value="setMember(i, $event === 'all' ? { all: 'all' in m ? m.all : m.any } : { any: 'all' in m ? m.all : m.any })" />
          <WhenEditor :model-value="m" :rules="rules" nested @update:model-value="setMember(i, $event)" />
        </div>
        <SButton size="sm" variant="ghost" icon="trash" icon-only :aria-label="t('remove')" :disabled="members.length <= 1" @click="removeMember(i)" />
      </div>
      <div class="dw-row">
        <SButton size="xs" icon="plus" @click="addMember(false)">{{ t('when.addRule') }}</SButton>
        <SButton v-if="!nested" size="xs" icon="plus" @click="addMember(true)">{{ t('when.addGroup') }}</SButton>
      </div>
    </div>
  </div>
</template>
