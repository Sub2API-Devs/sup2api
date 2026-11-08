<script setup lang="ts">
import { computed, onErrorCaptured, ref } from 'vue'
import { usePluginStore, type SlotEntry } from '@/stores/plugins'

// Renders every native plugin component registered for `name`
// (dashboard.widgets | account.detail.tabs | account.form.widgets | account.list.weight | account.list.toolbar).
// `props` is handed to each component; a function gets the entry, so the page
// can give every plugin its own values. A failing plugin component is hidden
// instead of breaking the page.
const props = defineProps<{ name: string; props?: Record<string, any> | ((entry: SlotEntry) => Record<string, any>); itemClass?: string }>()
const plugins = usePluginStore()
const failed = ref(new Set<string>())

const entries = computed(() => plugins.slotEntries(props.name).filter((e) => !failed.value.has(`${e.pluginKey}:${e.name}`)))
const propsOf = (e: SlotEntry) => (typeof props.props === 'function' ? props.props(e) : props.props || {})

onErrorCaptured((err, instance) => {
  const key = (instance?.$el as HTMLElement | undefined)?.closest?.('[data-plugin-slot]')?.getAttribute('data-plugin-slot')
  console.error(`[plugins] slot ${props.name} component failed`, key, err)
  if (key) failed.value = new Set([...failed.value, key])
  return false
})
</script>

<template>
  <div
    v-for="e in entries"
    :key="`${e.pluginKey}:${e.name}`"
    :data-plugin-slot="`${e.pluginKey}:${e.name}`"
    :class="itemClass"
  >
    <component :is="e.component" v-bind="propsOf(e)" />
  </div>
</template>
