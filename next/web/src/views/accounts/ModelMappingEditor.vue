<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SButton, SIcon } from '@sub2api/ui'

// Table editor of an account's model_mapping (request model -> upstream
// model, CONTRACTS §18). Rows keep their order locally, like SKeyValue; a
// row whose request model is missing from a non-empty model list is flagged,
// because the account would never be scheduled for it.
const props = defineProps<{
  modelValue: Record<string, string>
  /** The account's model list; empty means "every model". */
  models: string[]
  /** id of a <datalist> with model suggestions. */
  listId?: string
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: Record<string, string>): void; (e: 'add-models', models: string[]): void }>()
const { t } = useI18n()

interface Row {
  k: string
  v: string
}
const rows = ref<Row[]>([])

const fromModel = (m: Record<string, string>): Row[] => Object.entries(m || {}).map(([k, v]) => ({ k, v: String(v ?? '') }))
function toModel(list: Row[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const r of list) if (r.k.trim()) out[r.k.trim()] = r.v.trim()
  return out
}

watch(
  () => props.modelValue,
  (m) => {
    if (JSON.stringify(toModel(rows.value)) !== JSON.stringify(m || {})) rows.value = fromModel(m)
  },
  { immediate: true, deep: true }
)

const sync = () => emit('update:modelValue', toModel(rows.value))
function add() {
  rows.value.push({ k: '', v: '' })
}
function remove(i: number) {
  rows.value.splice(i, 1)
  sync()
}

/** Request models of the mapping the account cannot be scheduled for. */
const unscheduled = computed(() => {
  if (!props.models.length) return []
  return [...new Set(rows.value.map((r) => r.k.trim()).filter((k) => k && !props.models.includes(k)))]
})
const isUnscheduled = (r: Row) => unscheduled.value.includes(r.k.trim())
</script>

<template>
  <div class="space-y-2" data-testid="mapping-table">
    <div v-if="!rows.length" class="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center dark:border-dark-600">
      <p class="text-sm text-gray-500 dark:text-dark-400">{{ t('accounts.editorUi.mappingEmpty') }}</p>
      <SButton size="sm" @click="add"><SIcon name="plus" class="h-3.5 w-3.5" />{{ t('accounts.editorUi.mappingAdd') }}</SButton>
    </div>
    <template v-else>
      <div class="grid grid-cols-[minmax(0,1fr)_1.25rem_minmax(0,1fr)_2rem] gap-2 px-1 text-xs font-medium text-gray-500 dark:text-dark-400">
        <span>{{ t('accounts.mappingFrom') }}</span>
        <span />
        <span>{{ t('accounts.mappingTo') }}</span>
        <span />
      </div>
      <div class="max-h-80 space-y-1 overflow-y-auto rounded-lg border border-line p-2">
        <div v-for="(r, i) in rows" :key="i">
          <div class="grid grid-cols-[minmax(0,1fr)_1.25rem_minmax(0,1fr)_2rem] items-center gap-2">
            <input
              v-model="r.k"
              class="input input-sm !h-8 !rounded-lg font-mono text-xs"
              :class="isUnscheduled(r) ? '!border-amber-400' : ''"
              :list="listId"
              placeholder="claude-3-5-sonnet-latest"
              spellcheck="false"
              @input="sync"
            />
            <SIcon name="chevron-right" class="h-4 w-4 text-gray-400" />
            <input v-model="r.v" class="input input-sm !h-8 !rounded-lg font-mono text-xs" :list="listId" placeholder="claude-sonnet-4-5" spellcheck="false" @input="sync" />
            <button type="button" class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20" :title="t('ui.remove')" @click="remove(i)">
              <SIcon name="x" class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2 pt-1">
        <SButton size="sm" @click="add"><SIcon name="plus" class="h-3.5 w-3.5" />{{ t('accounts.editorUi.mappingAdd') }}</SButton>
      </div>
    </template>
    <div v-if="unscheduled.length" class="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-300" data-testid="mapping-unscheduled">
      <SIcon name="warning" class="h-4 w-4 shrink-0" />
      <span class="min-w-0 flex-1">{{ t('accounts.editorUi.mappingNotInModels', { n: unscheduled.length, models: unscheduled.slice(0, 3).join(', ') + (unscheduled.length > 3 ? ' …' : '') }) }}</span>
      <button type="button" class="font-medium underline-offset-2 hover:underline" @click="emit('add-models', unscheduled)">{{ t('accounts.editorUi.mappingAddToModels') }}</button>
    </div>
  </div>
</template>
