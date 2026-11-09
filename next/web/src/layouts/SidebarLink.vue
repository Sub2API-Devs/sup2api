<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SIcon } from '@sub2api/ui'
import { useAppStore, type NavItem } from '@/stores/app'
import { lt } from '@/i18n'

/** One sidebar entry: icon and label, an icon alone when collapsed, a label alone inside a submenu. */
const props = defineProps<{ item: NavItem; active: boolean; collapsed?: boolean; nested?: boolean }>()

const app = useAppStore()
const { t } = useI18n()

const label = computed(() => (props.item.labelKey ? t(props.item.labelKey) : lt(props.item.label)))
/** Attribution for SIcon's unknown-name warning: which menu entry declared it. */
const iconContext = computed(() => (props.item.pluginKey ? `plugin "${props.item.pluginKey}" menu "${props.item.id}"` : `menu "${props.item.id}"`))
</script>

<template>
  <RouterLink
    :to="item.path"
    :title="collapsed ? label : undefined"
    :aria-label="collapsed ? label : undefined"
    :aria-current="active ? 'page' : undefined"
    class="mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors"
    :class="[
      nested ? 'pl-11' : '',
      active
        ? 'bg-primary-50 font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
        : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
    ]"
    @click="app.mobileNavOpen = false"
  >
    <SIcon v-if="!nested" :name="item.icon || 'puzzle'" :context="iconContext" class="h-5 w-5 shrink-0" />
    <span v-if="!collapsed" class="truncate">{{ label }}</span>
  </RouterLink>
</template>
