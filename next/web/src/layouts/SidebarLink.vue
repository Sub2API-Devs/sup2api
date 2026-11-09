<script setup lang="ts">
import { computed } from 'vue'
import { SIcon } from '@sub2api/ui'
import { useAppStore, type NavItem } from '@/stores/app'
import { navItemContext, navStateClass, useNavItemLabel } from './navItem'

/** One sidebar entry: icon and label, an icon alone when collapsed, a label alone inside a submenu. */
const props = defineProps<{ item: NavItem; active: boolean; collapsed?: boolean; nested?: boolean }>()

const app = useAppStore()
const labelOf = useNavItemLabel()

const label = computed(() => labelOf(props.item))
</script>

<template>
  <RouterLink
    :to="item.path"
    :title="collapsed ? label : undefined"
    :aria-label="collapsed ? label : undefined"
    :aria-current="active ? 'page' : undefined"
    class="mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors"
    :class="[nested ? 'pl-11' : '', navStateClass(active)]"
    @click="app.mobileNavOpen = false"
  >
    <SIcon v-if="!nested" :name="item.icon || 'puzzle'" :context="navItemContext(item)" class="h-5 w-5 shrink-0" />
    <span v-if="!collapsed" class="truncate">{{ label }}</span>
  </RouterLink>
</template>
