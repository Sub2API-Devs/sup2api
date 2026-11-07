<script setup lang="ts">
// Page header actions: the page's #actions (default slot) followed by its
// secondary actions `menu`, as ghost buttons on a wide screen and folded
// into a "⋯" menu on a compact one. `topBar` marks the group as lifted into
// the app top bar, where a compact SButton with an icon shows only the icon.
import { computed } from 'vue'
import type { MenuAction } from '../types'
import { provideTopBar } from '../titleContext'
import { useViewport } from '../viewport'
import SButton from '../SButton.vue'
import SDropdown from '../SDropdown.vue'

const props = defineProps<{ menu?: MenuAction[]; topBar?: boolean }>()
const emit = defineEmits<{ (e: 'select', key: string): void }>()
if (props.topBar) provideTopBar()
const { compact } = useViewport()
const shown = computed(() => props.menu?.filter(a => !a.hidden) ?? [])
const buttons = computed(() => (compact.value ? [] : shown.value))
</script>

<template>
  <div>
    <slot />
    <SDropdown v-if="compact && shown.length" :actions="shown" data-testid="page-menu" @select="emit('select', $event)" />
    <SButton
      v-for="a in buttons"
      :key="a.key"
      variant="ghost"
      :icon="a.icon"
      :disabled="a.disabled"
      :tone="a.danger ? 'danger' : 'default'"
      :data-key="a.key"
      @click="emit('select', a.key)"
    >
      {{ a.label }}
    </SButton>
  </div>
</template>
