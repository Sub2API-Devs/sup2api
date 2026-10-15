<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SBadge, SButton, SChip, SHint, SInput, SSelect, type SelectOption } from '@sub2api/ui'
import type { PlatformEndpoint } from '@/api/types'
import { usePlatforms } from '@/composables/platforms'

// Protocols a sticky rule matches: chips of the selected ones plus a picker
// of the protocols the platforms declare (grouped by platform). A manual
// entry is offered only when the platform list may be incomplete.
const model = defineModel<string[]>({ required: true })
defineProps<{ disabled?: boolean }>()
const { t } = useI18n()

// The composable caches and de-duplicates concurrent calls, so loading on every open is fine.
const platforms = usePlatforms()
platforms.load()
const draft = ref('')

type Entry = { protocol: string; platformId: string; platformLabel: string; detail: string }

/** One entry per declared protocol, in platform order; the first platform declaring it wins. */
const entries = computed(() => {
  const out = new Map<string, Entry>()
  for (const p of platforms.platforms.value) {
    const byProtocol = new Map<string, PlatformEndpoint[]>()
    for (const e of p.endpoints || []) {
      if (e.protocol) byProtocol.set(e.protocol, [...(byProtocol.get(e.protocol) || []), e])
    }
    for (const [protocol, eps] of byProtocol) {
      if (out.has(protocol)) continue
      // Several endpoints may share a protocol: show the first one and "+n".
      const detail = `${eps[0].method} ${eps[0].path}${eps.length > 1 ? ` +${eps.length - 1}` : ''}`
      out.set(protocol, { protocol, platformId: p.id, platformLabel: platforms.label(p.id), detail })
    }
  }
  return out
})

/** Not yet selected protocols, grouped by platform (<optgroup>). */
const options = computed<SelectOption[]>(() => {
  const groups = new Map<string, SelectOption & { options: SelectOption[] }>()
  for (const e of entries.value.values()) {
    if (model.value.includes(e.protocol)) continue
    if (!groups.has(e.platformId)) groups.set(e.platformId, { value: e.platformId, label: e.platformLabel, options: [] })
    groups.get(e.platformId)!.options.push({ value: e.protocol, label: `${e.protocol} · ${e.detail}` })
  }
  return [...groups.values()]
})

/** A hand-written glob ("anthropic.*", "*"): the server matches those too, so never "unknown". */
const isPattern = (p: string) => /[*?]/.test(p)
/** Selected but not declared anywhere (e.g. its plugin was removed): kept as is. */
const isUnknown = (p: string) => platforms.loaded.value && !isPattern(p) && !entries.value.has(p)
const hasUnknown = computed(() => model.value.some(isUnknown))
/** The built-in catalog is a fallback: plugin protocols are then missing. */
const partial = computed(() => platforms.loaded.value && !platforms.complete.value)

function titleOf(p: string) {
  const e = entries.value.get(p)
  return e ? `${e.platformLabel} · ${e.detail}` : ''
}

function add(v: unknown) {
  const p = String(v || '').trim()
  if (p && !model.value.includes(p)) model.value = [...model.value, p]
}

function addDraft() {
  add(draft.value)
  draft.value = ''
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-1.5">
    <SChip
      v-for="p in model"
      :key="p"
      :tone="isUnknown(p) ? 'warning' : 'primary'"
      :closable="!disabled"
      :close-label="t('common.remove')"
      :title="titleOf(p)"
      @close="model = model.filter((x) => x !== p)"
    >
      <span class="inline-flex items-center gap-1">
        <span class="font-mono">{{ p }}</span>
        <SBadge v-if="isUnknown(p)" tone="warning">{{ t('sticky.modal.protocolUnknown') }}</SBadge>
        <SBadge v-else-if="isPattern(p)" tone="gray">{{ t('sticky.modal.protocolPattern') }}</SBadge>
      </span>
    </SChip>
    <SSelect
      v-if="!disabled && options.length"
      :model-value="null"
      :options="options"
      :placeholder="t('sticky.modal.protocolPick')"
      class="w-auto"
      size="sm"
      :aria-label="t('sticky.modal.protocolPick')"
      @update:model-value="add"
    />
    <SHint v-if="disabled && !model.length" inline size="xs">{{ t('sticky.any') }}</SHint>
  </div>
  <SHint v-if="hasUnknown" tone="warning" size="xs" class="mt-1">{{ t('sticky.modal.protocolUnknownHint') }}</SHint>
  <template v-if="partial">
    <SHint tone="warning" size="xs" class="mt-1">{{ t('sticky.modal.protocolsPartial') }}</SHint>
    <div v-if="!disabled" class="mt-1 flex items-center gap-1.5">
      <SInput v-model="draft" mono size="sm" :placeholder="t('sticky.modal.protocolManual')" @keydown.enter.prevent="addDraft" />
      <SButton size="sm" :disabled="!draft.trim()" icon="plus" @click="addDraft">{{ t('common.add') }}</SButton>
    </div>
  </template>
</template>
