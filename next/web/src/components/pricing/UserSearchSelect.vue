<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SHint, SInput, SSpinner } from '@sub2api/ui'
import type { User } from '@/api/types'
import { useLatestRequest } from '@/composables/useLatestRequest'
import SegmentBadge from './SegmentBadge.vue'

// Finds one user by email or display name (GET /users?q=) and hands it to the
// parent, which shows whom it picked; the field itself goes back to empty.
// Small on purpose: a general entity picker is to take its place.
const props = defineProps<{ placeholder?: string; disabled?: boolean; excludeIds?: number[] }>()
const emit = defineEmits<{ (e: 'select', user: User): void }>()
const { t } = useI18n()

const PAGE_SIZE = 8
const listId = useId()
const query = ref('')
const open = ref(false)
const active = ref(0)

const { result, loading, error } = useLatestRequest(
  () => query.value.trim() || null,
  async (q) => (await api.list<User>('/users', { q, page_size: PAGE_SIZE })).items
)
const users = computed(() => (result.value ?? []).filter((u) => !props.excludeIds?.includes(u.id)))
const shown = computed(() => open.value && !!query.value.trim())
watch(users, () => (active.value = 0))
// Typing brings back a list that Escape closed.
watch(query, () => (open.value = true))

function pick(u: User | undefined) {
  if (!u) return
  emit('select', u)
  query.value = ''
  open.value = false
}

function move(step: number) {
  active.value = Math.max(0, Math.min(active.value + step, users.value.length - 1))
}

function onKey(e: KeyboardEvent) {
  if (e.isComposing || !shown.value) return
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') move(e.key === 'ArrowDown' ? 1 : -1)
  else if (e.key === 'Enter') pick(users.value[active.value])
  else if (e.key === 'Escape') open.value = false
  else return
  // The key was the list's: an enclosing form or dialog does not act on it.
  e.preventDefault()
  e.stopPropagation()
}
</script>

<template>
  <div class="relative" data-testid="user-search">
    <SInput
      v-model="query"
      icon="search"
      clearable
      autocomplete="off"
      role="combobox"
      aria-autocomplete="list"
      :aria-expanded="shown"
      :aria-controls="listId"
      :aria-activedescendant="shown && users.length ? `${listId}-${active}` : undefined"
      :aria-label="placeholder ?? t('pricingTools.userSearch.placeholder')"
      :placeholder="placeholder ?? t('pricingTools.userSearch.placeholder')"
      :disabled="disabled"
      data-testid="user-search-input"
      @focus="open = true"
      @blur="open = false"
      @keydown="onKey"
    />
    <!-- mousedown is kept from the input, so a click on a row does not blur it first. -->
    <ul v-if="shown" :id="listId" role="listbox" class="dropdown absolute inset-x-0 mt-1 max-h-72 overflow-y-auto" data-testid="user-search-results" @mousedown.prevent>
      <li
        v-for="(u, i) in users"
        :id="`${listId}-${i}`"
        :key="u.id"
        role="option"
        :aria-selected="i === active"
        class="dropdown-item justify-between"
        :class="i === active ? 'bg-gray-100 dark:bg-dark-700' : ''"
        :data-testid="`user-search-option-${u.id}`"
        @mouseenter="active = i"
        @click="pick(u)"
      >
        <span class="min-w-0">
          <span class="block truncate font-medium text-fg">{{ u.email }}</span>
          <SHint v-if="u.display_name" size="xs" class="truncate">{{ u.display_name }}</SHint>
        </span>
        <SegmentBadge :segment="u.segment" class="shrink-0" />
      </li>
      <li v-if="!users.length" role="presentation" class="px-4 py-2">
        <SSpinner v-if="loading" size="sm" />
        <SHint v-else :tone="error ? 'danger' : 'muted'">{{ error || t('pricingTools.userSearch.empty') }}</SHint>
      </li>
    </ul>
  </div>
</template>
