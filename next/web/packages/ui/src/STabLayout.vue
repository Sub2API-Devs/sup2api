<script setup lang="ts">
import { computed, useId } from 'vue'
import STabs from './STabs.vue'
import STitleScope from './STitleScope.vue'
import type { TabItem } from './types'

const props = withDefaults(defineProps<{
  tabs: TabItem[]
  modelValue: string
  showTabs?: boolean
  showSingle?: boolean
  idPrefix?: string
  size?: 'sm' | 'md'
  ariaLabel?: string
}>(), { showTabs: true, showSingle: false, size: 'md' })
const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()
const uid = useId()
const prefix = computed(() => props.idPrefix || uid)
const current = computed(() => props.tabs.find(tab => tab.key === props.modelValue && !tab.disabled) || props.tabs.find(tab => !tab.disabled))
const visible = computed(() => props.showTabs && props.tabs.length > (props.showSingle ? 0 : 1))
</script>
<template>
  <div class="space-y-5">
    <STabs
      v-if="visible"
      :tabs="tabs"
      :model-value="current?.key || ''"
      :id-prefix="prefix"
      :size="size"
      :aria-label="ariaLabel"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <STitleScope
      :id="visible && current ? `${prefix}-panel-${current.key}` : undefined"
      class="space-y-5"
      :title="visible ? current?.label : undefined"
      :role="visible ? 'tabpanel' : undefined"
      :aria-labelledby="visible && current ? `${prefix}-tab-${current.key}` : undefined"
      :tabindex="visible ? 0 : undefined"
    >
      <slot :active="current?.key || ''" />
    </STitleScope>
  </div>
</template>
