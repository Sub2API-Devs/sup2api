<script setup lang="ts">
import { computed, ref } from 'vue'
import { SChip, useAutoRefresh, useViewport } from '@sub2api/ui'
import { fetchDegraded, seesAllAccounts, useDwHost, type Degraded } from './host'

// account.list.toolbar slot: "N accounts degraded" as a toggle chip that
// filters the account list to them (setIds) and back. `ids` is the set this
// plugin gave the core (other plugins' sets narrow the list too); pressed
// while it is the one this chip set, and the core's own filter chip clears
// it too. Refreshed every 30 s. Phones get the short label without the
// icon: the core gives the slot an equal share of the search row, too narrow
// for both in English ("2 degraded" was cut). Without account:read the
// chip never asks (the core refuses /degraded) and stays hidden.
const props = defineProps<{ ids: number[] | null; setIds: (ids: number[] | null, label: string) => void }>()
const t = useDwHost().t
const { compact } = useViewport()
const degraded = ref<Degraded | null>(null)
const applied = ref('') // the ids this chip set, joined

async function load() {
  if (!seesAllAccounts()) return
  try {
    degraded.value = await fetchDegraded()
  } catch {
    /* the slot is optional */
  }
}
void load()
useAutoRefresh(load, 30_000)

const count = computed(() => degraded.value?.count ?? 0)
const pressed = computed(() => !!props.ids && props.ids.join(',') === applied.value)

function toggle() {
  if (pressed.value) {
    props.setIds(null, '')
    applied.value = ''
    return
  }
  const ids = degraded.value?.account_ids ?? []
  applied.value = ids.join(',')
  props.setIds(ids, t('degraded.label', { n: count.value }))
}
</script>

<template>
  <SChip
    v-if="count > 0 || pressed"
    tone="warning"
    :icon="compact ? undefined : 'chart'"
    :pressed="pressed"
    :title="t('degraded.title')"
    @click="toggle"
  >
    {{ t(compact ? 'degraded.short' : 'degraded.label', { n: count }) }}
  </SChip>
</template>
