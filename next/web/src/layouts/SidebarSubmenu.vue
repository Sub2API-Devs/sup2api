<script setup lang="ts">
import { SIcon } from '@sub2api/ui'
import type { NavSection } from '@/stores/app'
import SidebarLink from './SidebarLink.vue'
import { sectionIcon } from './sidebarGroups'

/** A section of the admin group folded under one expandable entry. */
defineProps<{ section: NavSection; label: string; open: boolean; activePath?: string }>()
defineEmits<{ toggle: [] }>()
</script>

<template>
  <button
    type="button"
    class="mb-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
    :aria-expanded="open"
    :data-testid="`nav-submenu-${section.key}`"
    @click="$emit('toggle')"
  >
    <SIcon :name="sectionIcon(section)" class="h-5 w-5 shrink-0" />
    <span class="flex-1 truncate text-left">{{ label }}</span>
    <SIcon name="chevron-right" class="h-4 w-4 shrink-0 text-fg-subtle transition-transform" :class="open ? 'rotate-90' : ''" />
  </button>
  <template v-if="open">
    <SidebarLink v-for="i in section.items" :key="i.id" :item="i" :active="i.path === activePath" nested />
  </template>
</template>
