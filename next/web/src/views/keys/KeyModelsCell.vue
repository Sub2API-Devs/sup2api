<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Group } from '@/api/types'
import BrandMark from '@/components/platform/BrandMark.vue'
import ModelBadge from '@/components/platform/ModelBadge.vue'
import { modelBrand, modelVendor } from '@/components/platform/brands'
import KeyListChip from './KeyListChip.vue'

// The models a key's group lets it call: its allow- or blocklist as a chip
// led by the marks of their vendors (decoration: the tooltip names every
// entry beside its mark). An entry may be a pattern (claude-*), so the chip
// counts entries, not models. Without the group (deleted, closed to the
// owner, not loaded yet) the models are not known: a dash, not "unlimited".
const props = defineProps<{ group?: Group }>()
const { t } = useI18n()
const items = computed(() => props.group?.model_allowlist ?? [])
const label = computed(() =>
  t(props.group?.model_filter_mode === 'blacklist' ? 'apikeys.models.blocked' : 'apikeys.models.allowed', items.value.length)
)
/** One model per vendor, so each vendor's mark shows once. */
const vendors = computed(() => [...new Map(items.value.map(m => [modelVendor(m) || m, m])).values()].slice(0, 3))
</script>

<template>
  <span v-if="!group" class="text-fg-subtle">—</span>
  <KeyListChip v-else :items="items" :empty-label="t('apikeys.unlimited')" :label="label">
    <template #lead><BrandMark v-for="m in vendors" :key="m" :brand="modelBrand(m)" :label="m" decorative /></template>
    <template #item="{ item }"><ModelBadge :model="item" plain /></template>
  </KeyListChip>
</template>
