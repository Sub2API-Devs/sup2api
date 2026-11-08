<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SButton, SCheckbox, SInput, SSegmented, SSelect } from '@sub2api/ui'
import { conditionModeOptions } from './describe'
import { readOperation, type OperationDraft } from './model'

// The "when" block of an operation: its conditions and how they combine.
// No condition means the operation runs on every request.
const draft = defineModel<OperationDraft>({ required: true })
defineProps<{ errorOf: (field: string) => string; contextListId: string }>()
const { t } = useI18n()
const P = 'accounts.paramOverride'

const modes = computed(() => conditionModeOptions(t))
const logicOptions = computed(() => [
  { value: 'OR', label: t(`${P}.logicOr`) },
  { value: 'AND', label: t(`${P}.logicAnd`) }
])

function add() {
  const [c] = readOperation({ conditions: [{ path: 'model', mode: 'prefix', value: '' }] }).conditions
  draft.value.conditions.push(c)
}
const remove = (i: number) => draft.value.conditions.splice(i, 1)
</script>

<template>
  <section class="rounded-xl border border-line p-3" data-testid="po-conditions">
    <header class="mb-2 flex flex-wrap items-center gap-2">
      <span class="rounded bg-fg px-1.5 py-0.5 text-xs font-semibold text-surface">{{ t(`${P}.whenTag`) }}</span>
      <span class="text-xs text-fg-muted">{{ draft.conditions.length ? t(`${P}.whenHint`) : t(`${P}.whenAlways`) }}</span>
      <SSegmented
        v-if="draft.conditions.length > 1"
        v-model="draft.logic"
        class="ml-auto"
        size="sm"
        :options="logicOptions"
        :aria-label="t(`${P}.logic`)"
      />
    </header>
    <div
      v-for="(c, i) in draft.conditions"
      :key="c.id"
      class="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1.2fr)_8rem_minmax(0,1fr)_auto] sm:items-start"
      data-testid="po-condition"
    >
      <SInput
        v-model="c.path"
        size="sm"
        mono
        :list="contextListId"
        :placeholder="t(`${P}.condPathPlaceholder`)"
        :aria-label="t(`${P}.condPath`)"
        :error="!!errorOf(`conditions.${i}.path`)"
      />
      <SSelect v-model="c.mode" size="sm" :options="modes" :aria-label="t(`${P}.condMode`)" />
      <SInput
        v-model="c.valueText"
        size="sm"
        mono
        :placeholder="t(`${P}.condValuePlaceholder`)"
        :aria-label="t(`${P}.condValue`)"
        :error="!!errorOf(`conditions.${i}.value`)"
      />
      <div class="flex items-center gap-3 sm:h-8">
        <SCheckbox v-model="c.invert" size="xs" :label="t(`${P}.invert`)" />
        <SCheckbox v-model="c.passMissing" size="xs" :label="t(`${P}.passMissing`)" />
        <SButton size="xs" variant="ghost" icon="x" icon-only :aria-label="t(`${P}.removeCondition`)" @click="remove(i)" />
      </div>
    </div>
    <SButton size="xs" variant="ghost" icon="plus" data-testid="po-add-condition" @click="add">{{ t(`${P}.addCondition`) }}</SButton>
  </section>
</template>
