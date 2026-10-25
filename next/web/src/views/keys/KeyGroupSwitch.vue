<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SDropdown, SIcon } from '@sub2api/ui'

// Opens a menu of the groups the owner may use from the default slot (the
// key's group cell); picking another group emits change(groupId).
const props = defineProps<{
  groupId: number
  options: { value: number; label: string }[]
  disabled?: boolean
}>()
const emit = defineEmits<{ (e: 'change', groupId: number): void }>()
const { t } = useI18n()
const actions = computed(() => props.options.map((o) => ({ key: String(o.value), label: o.label, checked: o.value === props.groupId })))
function pick(key: string) {
  if (Number(key) !== props.groupId) emit('change', Number(key))
}
</script>

<template>
  <SDropdown :actions="actions" align="start" width="20rem" max-height="20rem" :disabled="disabled || !options.length" @select="pick">
    <template #header>{{ t('apikeys.changeGroup') }}</template>
    <template #trigger="{ toggle, attrs }">
      <button
        type="button"
        class="-mx-2 -my-1 flex items-center gap-1 rounded-lg px-2 py-1 text-left transition-colors hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 disabled:cursor-not-allowed disabled:opacity-60"
        :title="t('apikeys.changeGroup')"
        :disabled="disabled || !options.length"
        data-testid="key-group-switch"
        v-bind="attrs"
        @click.stop="toggle"
      >
        <slot />
        <SIcon name="chevron-down" class="h-3.5 w-3.5 shrink-0 text-fg-muted" />
      </button>
    </template>
  </SDropdown>
</template>
