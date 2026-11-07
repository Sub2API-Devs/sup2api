<script setup lang="ts">
import { computed, onErrorCaptured, ref } from 'vue'
import type { Account } from '@/api/types'
import { usePluginStore } from '@/stores/plugins'

// Renders every native plugin component registered for `name`
// (dashboard.widgets | account.detail.tabs | account.form.widgets | account.list.weight | account.list.toolbar).
// A failing plugin component is hidden instead of breaking the page.
// account.form.widgets components may expose validate() / save(account)
// (CONTRACTS §23.3 UI 3.6); the slot aggregates them for the account editor.
const props = defineProps<{ name: string; props?: Record<string, any>; itemClass?: string }>()
const plugins = usePluginStore()
const failed = ref(new Set<string>())

interface WidgetInstance {
  validate?: () => Promise<string | null>
  save?: (account: Account) => Promise<void>
}

const id = (e: { pluginKey: string; name: string }) => `${e.pluginKey}:${e.name}`
const entries = computed(() => plugins.slotEntries(props.name).filter((e) => !failed.value.has(id(e))))
const instances = new Map<string, WidgetInstance>()
function track(key: string, el: unknown) {
  if (el) instances.set(key, el as WidgetInstance)
  else instances.delete(key)
}
/** The mounted components, in slot order, with their plugin key. */
const mounted = () => entries.value.flatMap((e) => (instances.has(id(e)) ? [[e.pluginKey, instances.get(id(e))!] as const] : []))

/** The first error a widget reports, or null when all pass; a throwing widget counts as an error. */
async function validate(): Promise<string | null> {
  for (const [pluginKey, w] of mounted()) {
    try {
      const error = await w.validate?.()
      if (error) return error
    } catch (error) {
      return error instanceof Error && error.message ? error.message : pluginKey
    }
  }
  return null
}

/** Lets every widget save against the saved account; the failures are returned, not thrown. */
async function save(account: Account): Promise<Array<{ pluginKey: string; error: unknown }>> {
  const failures: Array<{ pluginKey: string; error: unknown }> = []
  for (const [pluginKey, w] of mounted()) {
    try {
      await w.save?.(account)
    } catch (error) {
      failures.push({ pluginKey, error })
    }
  }
  return failures
}

defineExpose({ validate, save })

onErrorCaptured((err, instance) => {
  const key = (instance?.$el as HTMLElement | undefined)?.closest?.('[data-plugin-slot]')?.getAttribute('data-plugin-slot')
  console.error(`[plugins] slot ${props.name} component failed`, key, err)
  if (key) failed.value = new Set([...failed.value, key])
  return false
})
</script>

<template>
  <div v-for="e in entries" :key="id(e)" :data-plugin-slot="id(e)" :class="itemClass">
    <component :is="e.component" :ref="(el: unknown) => track(id(e), el)" v-bind="props.props || {}" />
  </div>
</template>
