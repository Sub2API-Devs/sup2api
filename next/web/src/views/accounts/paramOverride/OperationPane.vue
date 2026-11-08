<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SCheckbox, SField, SInput, SSelect, SSwitch, STagInput, STextarea } from '@sub2api/ui'
import ConditionList from './ConditionList.vue'
import { describeOperation, describeProblem, modeOptions } from './describe'
import { MODES, type OperationDraft, type Problem } from './model'

// The selected operation: what it does ("do" block: mode, path / from / to,
// value, keep_origin) and when ("when" block, ConditionList). The fields
// shown follow the mode (MODES).
const draft = defineModel<OperationDraft>({ required: true })
const props = defineProps<{ problems: Problem[]; contextListId: string }>()
const { t } = useI18n()
const P = 'accounts.paramOverride'
const HEADER_EXAMPLES = { remove: '{"context-1m-2025-08-07": null}', append: '"$append": ["…"]' }

const meta = computed(() => MODES[draft.value.mode])
const modes = computed(() => modeOptions(t))
const errorOf = (field: string) => {
  const p = props.problems.find(x => x.field === field)
  return p ? describeProblem(p, t) : ''
}
/** Labels of from / to: paths, header names, or search / replacement text. */
const fromTo = computed(() => {
  const kind = meta.value?.fromTo
  const regex = draft.value.mode === 'regex_replace'
  return kind === 'text'
    ? { from: regex ? 'regexFrom' : 'textFrom', to: regex ? 'regexTo' : 'textTo' }
    : { from: `${kind}From`, to: `${kind}To` }
})
const pathPlaceholder = computed(() => t(meta.value?.path === 'header' ? `${P}.headerPlaceholder` : `${P}.pathPlaceholder`))
</script>

<template>
  <div class="space-y-3">
    <section class="rounded-xl border border-line p-3" data-testid="po-action">
      <header class="mb-3 flex items-center gap-2">
        <span class="rounded bg-fg px-1.5 py-0.5 text-xs font-semibold text-surface">{{ t(`${P}.doTag`) }}</span>
        <span class="text-xs text-fg-muted">{{ t(`${P}.groupsHint.${meta?.group ?? 'body'}`) }}</span>
      </header>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SField :label="t(`${P}.mode`)" :error="errorOf('mode')">
          <SSelect v-model="draft.mode" size="sm" searchable :options="modes" data-testid="po-mode" />
        </SField>
        <SField v-if="meta?.path" :label="t(meta.path === 'header' ? `${P}.headerName` : `${P}.path`)" :error="errorOf('path')">
          <SInput v-model="draft.path" size="sm" mono :placeholder="pathPlaceholder" data-testid="po-path" />
        </SField>
        <template v-if="meta?.fromTo">
          <SField :label="t(`${P}.${fromTo.from}`)" :error="errorOf('from')">
            <SInput v-model="draft.from" size="sm" mono data-testid="po-from" />
          </SField>
          <SField :label="t(`${P}.${fromTo.to}`)" :error="errorOf('to')">
            <SInput v-model="draft.to" size="sm" mono data-testid="po-to" />
          </SField>
        </template>
      </div>

      <div v-if="meta?.value" class="mt-3">
        <SField v-if="meta.value === 'json'" :label="t(`${P}.value`)" :hint="t(`${P}.valueJsonHint`)" :error="errorOf('value')">
          <STextarea v-model="draft.valueText" size="sm" mono :rows="3" data-testid="po-value" />
        </SField>
        <SField v-else-if="meta.value === 'text'" :label="t(`${P}.value`)" :error="errorOf('value')">
          <SInput v-model="draft.valueText" size="sm" mono data-testid="po-value" />
        </SField>
        <SField
          v-else-if="meta.value === 'header'"
          :label="t(`${P}.headerValue`)"
          :hint="t(`${P}.headerValueHint`, HEADER_EXAMPLES)"
          :error="errorOf('value')"
        >
          <STextarea v-model="draft.valueText" size="sm" mono :rows="2" data-testid="po-value" />
        </SField>
        <SField v-else-if="meta.value === 'list'" :label="t(`${P}.passList`)" :hint="t(`${P}.passListHint`)" :error="errorOf('value')">
          <STagInput v-model="draft.list" size="sm" :placeholder="t(`${P}.headerPlaceholder`)" data-testid="po-value" />
        </SField>
        <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]" data-testid="po-error">
          <SField :label="t(`${P}.errMessage`)" :error="errorOf('error.message')">
            <SInput v-model="draft.error.message" size="sm" />
          </SField>
          <SField :label="t(`${P}.errStatus`)" :error="errorOf('error.status_code')">
            <SInput v-model.number="draft.error.status_code" size="sm" type="number" min="100" max="599" />
          </SField>
          <SField :label="t(`${P}.errCode`)">
            <SInput v-model="draft.error.code" size="sm" mono placeholder="invalid_request" />
          </SField>
          <SField :label="t(`${P}.errRetry`)">
            <SSwitch
              :model-value="!draft.error.skip_retry"
              size="sm"
              :label="t(`${P}.errRetryOn`)"
              @update:model-value="draft.error.skip_retry = !$event"
            />
          </SField>
        </div>
      </div>
      <SCheckbox v-if="meta?.keepOrigin" v-model="draft.keepOrigin" class="mt-3" size="xs" :label="t(`${P}.keepOrigin`)" />
    </section>

    <ConditionList v-model="draft" :error-of="errorOf" :context-list-id="contextListId" />

    <p class="rounded-lg bg-surface-2 px-3 py-2 text-xs text-fg-muted" data-testid="po-summary">{{ describeOperation(draft, t) }}</p>
  </div>
</template>
