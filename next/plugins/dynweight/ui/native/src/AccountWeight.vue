<script setup lang="ts">
import { ref, watch } from 'vue'
import { SBadge } from '@sub2api/ui'
import { loadAccountWeight, useDwHost, weightTone, type AccountWeight } from './host'

// account.list.weight slot: the lowest effective weight of an account's
// degraded (group, model) keys, under its weight in the account list. The list
// keeps a row's instance across its reloads, so a new row object reloads too.
const props = defineProps<{ account: { id: number; weight?: number } }>()
const t = useDwHost().t
const weight = ref<AccountWeight | null>(null)

async function load() {
  const id = props.account?.id
  const w = id ? await loadAccountWeight(id) : null
  if (props.account?.id === id) weight.value = w // the row may show another account by now
}

watch(() => [props.account, props.account?.weight], load, { immediate: true })
</script>

<template>
  <SBadge v-if="weight" :tone="weightTone(weight.lowest, weight.base)" size="xs" :title="t('slot.title', { n: weight.degraded })">
    {{ t('slot.label', { w: weight.lowest, n: weight.degraded }) }}
  </SBadge>
</template>
