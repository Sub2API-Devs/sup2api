<script setup lang="ts">
import { ref, watch } from 'vue'
import { SBadge, SLink, STooltip } from '@sub2api/ui'
import { useCatalog } from './catalog'
import { dashboardRoute, loadAccountWeight, useDwHost, weightOf, weightTone, type AccountWeight } from './host'

// account.list.weight slot: the lowest effective weight of an account's
// degraded (group, model) keys, under its weight in the account list. The
// badge links to the account's keys on the plugin page; hovering lists the
// lowest keys (group, model, effective · base). The list keeps a row's
// instance across its reloads, so a new row object reloads too.
const props = defineProps<{ account: { id: number; weight?: number } }>()
const t = useDwHost().t
const catalog = useCatalog()
const weight = ref<AccountWeight | null>(null)

async function load() {
  const id = props.account?.id
  const w = id ? await loadAccountWeight(id) : null
  if (props.account?.id === id) weight.value = w // the row may show another account by now
}

watch(() => [props.account, props.account?.weight], load, { immediate: true })
</script>

<template>
  <STooltip v-if="weight" variant="card" placement="bottom" max-width="28rem" :disabled="!weight.keys?.length">
    <SLink :to="dashboardRoute('status', { account_id: account.id })" :title="weight.keys?.length ? undefined : t('slot.title', { n: weight.degraded })">
      <SBadge :tone="weightTone(weight.lowest, weight.base)" size="xs">{{ t('slot.label', { w: weight.lowest, n: weight.degraded }) }}</SBadge>
    </SLink>
    <template #content>
      <div class="dw-sub">{{ t('slot.title', { n: weight.degraded }) }}</div>
      <div class="dw-keys">
        <template v-for="k in weight.keys" :key="`${k.group_id}|${k.model}`">
          <span>{{ catalog.groupName(k.group_id) }}</span>
          <span>{{ k.model }}</span>
          <span class="dw-num">{{ weightOf(k.eff) }} · {{ k.base }}</span>
        </template>
      </div>
      <div v-if="weight.degraded > (weight.keys?.length ?? 0)" class="dw-sub">{{ t('slot.more', { n: weight.degraded - (weight.keys?.length ?? 0) }) }}</div>
    </template>
  </STooltip>
</template>
