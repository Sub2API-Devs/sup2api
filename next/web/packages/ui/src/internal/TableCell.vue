<script setup lang="ts">
// STable's default cell content (table row or phone card), used when the page
// gives no `cell-<key>` slot: an SIPAddress for `format: 'ip'`, else the
// value as text ('—' when empty). Internal to STable.
import SIPAddress from '../SIPAddress.vue'
import type { TableColumn } from '../types'
import { displayValue } from '../value'

defineProps<{ column: TableColumn; value: unknown }>()
defineEmits<{ (e: 'filter', address: string): void }>()
</script>

<template>
  <SIPAddress
    v-if="column.format === 'ip'"
    :value="value"
    :copyable="column.copyable"
    :filterable="column.filterable"
    @filter="$emit('filter', $event)"
  />
  <template v-else>{{ displayValue(value) }}</template>
</template>
