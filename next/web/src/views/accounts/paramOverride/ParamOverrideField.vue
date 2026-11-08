<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SButton, SSettingRow } from '@sub2api/ui'
import ParamOverrideEditor from './ParamOverrideEditor.vue'
import { describeOperation } from './describe'
import { MODES, readOverride, type Override } from './model'

// The account editor's "request parameter override" row (CONTRACTS §84):
// what the override does at a glance, and the editor behind "Edit".
const model = defineModel<Override | null>({ required: true })
defineProps<{ models: string[]; error?: string; disabled?: boolean }>()
const { t } = useI18n()
const P = 'accounts.paramOverride'
const open = ref(false)

const drafts = computed(() => readOverride(model.value))
const headerOps = computed(() => drafts.value.filter(d => MODES[d.mode]?.group === 'header').length)
const summary = computed(() =>
  drafts.value.length
    ? [t(`${P}.count`, { n: drafts.value.length }), headerOps.value && t(`${P}.headerCount`, { n: headerOps.value })]
        .filter(Boolean)
        .join(' · ')
    : t(`${P}.none`)
)
</script>

<template>
  <SSettingRow :label="t(`${P}.title`)" :description="t(`${P}.hint`)" :error="error" data-testid="account-param-override">
    <div class="flex w-full flex-col gap-1.5 sm:w-96">
      <div class="flex items-center gap-2">
        <span
          class="min-w-0 flex-1 truncate text-sm"
          :class="drafts.length ? 'text-fg' : 'text-fg-muted'"
          data-testid="account-param-override-summary"
          >{{ summary }}</span
        >
        <SButton v-if="drafts.length" size="sm" variant="ghost" :disabled="disabled" @click="model = null">{{ t(`${P}.clear`) }}</SButton>
        <SButton size="sm" icon="edit" :disabled="disabled" data-testid="account-param-override-edit" @click="open = true">{{
          t(`${P}.edit`)
        }}</SButton>
      </div>
      <ol v-if="drafts.length" class="space-y-0.5 text-xs text-fg-muted">
        <li v-for="(d, i) in drafts.slice(0, 3)" :key="d.id" class="truncate">
          {{ i + 1 }}. {{ d.description || describeOperation(d, t) }}
        </li>
        <li v-if="drafts.length > 3">…</li>
      </ol>
    </div>
    <ParamOverrideEditor v-model:open="open" :value="model" :models="models" @apply="model = $event" />
  </SSettingRow>
</template>
