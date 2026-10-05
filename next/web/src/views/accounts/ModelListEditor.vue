<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { SIcon } from '@sub2api/ui'

const props = defineProps<{ modelValue: string[]; options: string[]; mapping: Record<string, string>; emptyText?: string; showOptions?: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: string[]): void }>()
const { t } = useI18n()
const search = ref('')
const category = ref('')
const browse = ref(props.showOptions || false)
const selected = computed(() => new Set(props.modelValue))
function family(id: string): string {
  const m = id.toLowerCase()
  for (const name of ['opus', 'sonnet', 'haiku', 'fable']) if (m.startsWith('claude-') && m.includes(name)) return `Claude ${name[0].toUpperCase()}${name.slice(1)}`
  if (m.startsWith('claude-')) return 'Claude'
  if (/^(gpt-|chatgpt-|o[134]-)/.test(m)) return 'OpenAI'
  if (m.startsWith('gemini-')) return 'Gemini'
  if (m.startsWith('deepseek-')) return 'DeepSeek'
  return t('accounts.editorUi.otherModels')
}
const catalog = computed(() => [...new Set([...props.modelValue, ...(browse.value ? props.options : [])])].sort())
const categories = computed(() => [...new Set(catalog.value.map(family))])
const filtered = computed(() => catalog.value.filter(m => (!category.value || family(m) === category.value) && m.toLowerCase().includes(search.value.trim().toLowerCase())))
const allChecked = computed(() => filtered.value.length > 0 && filtered.value.every(m => selected.value.has(m)))
function toggle(model: string) {
  emit('update:modelValue', selected.value.has(model) ? props.modelValue.filter(m => m !== model) : [...props.modelValue, model])
}
function toggleVisible() {
  const visible = new Set(filtered.value)
  emit('update:modelValue', allChecked.value ? props.modelValue.filter(m => !visible.has(m)) : [...new Set([...props.modelValue, ...filtered.value])])
}
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-line" data-testid="models-tags">
    <div class="flex flex-wrap items-center gap-2 border-b border-line bg-surface-2 px-3 py-2.5">
      <div class="relative min-w-[10rem] flex-1">
        <SIcon name="search" class="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-fg-subtle" />
        <input v-model="search" class="input input-sm !pl-8" :placeholder="t('accounts.editorUi.searchModels')" :aria-label="t('accounts.editorUi.searchModels')" data-testid="models-search" />
      </div>
      <button type="button" class="rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium hover:text-primary-600" :class="browse ? 'bg-primary-50 text-primary-700' : 'bg-surface text-fg-muted'" :aria-pressed="browse" data-testid="models-browse" @click="browse = !browse; category = ''">{{ t(browse ? 'accounts.editorUi.selectedOnly' : 'accounts.editorUi.chooseModels') }}</button>
    </div>
    <div class="flex flex-wrap gap-1 border-b border-line px-3 py-2">
      <button v-for="c in ['', ...categories]" :key="c" type="button" class="rounded-md px-2.5 py-1 text-xs" :class="category === c ? 'bg-primary-50 font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'text-fg-muted hover:bg-surface-2'" :aria-pressed="category === c" @click="category = c">{{ c || t('accounts.editorUi.allCategories') }} <span class="ml-1 opacity-60">{{ c ? catalog.filter(m => family(m) === c).length : catalog.length }}</span></button>
    </div>
    <div class="flex items-center justify-between border-b border-line px-3 py-2 text-xs text-fg-subtle">
      <label class="inline-flex cursor-pointer items-center gap-2"><input type="checkbox" class="accent-primary-500" :checked="allChecked" :disabled="!filtered.length" data-testid="models-select-visible" @change="toggleVisible" />{{ t('accounts.editorUi.selectVisible') }}</label>
      <span>{{ t('accounts.editorUi.selectedCount', { n: modelValue.length }) }}</span>
    </div>
    <div class="max-h-60 overflow-y-auto p-2">
      <div v-if="filtered.length" class="grid gap-1 sm:grid-cols-2">
        <label v-for="model in filtered" :key="model" class="flex min-w-0 cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-2 transition-colors" :class="selected.has(model) ? 'border-primary-100 bg-primary-50/40 dark:border-primary-900/50 dark:bg-primary-900/10' : 'border-transparent hover:bg-surface-2'">
          <input type="checkbox" class="mt-0.5 shrink-0 accent-primary-500" :checked="selected.has(model)" :aria-label="model" @change="toggle(model)" />
          <span class="min-w-0 flex-1">
            <span class="block truncate font-mono text-xs text-fg" :title="model">{{ model }}</span>
            <span v-if="mapping[model]" class="mt-1 flex items-center gap-1 text-violet-600 dark:text-violet-300" :title="t('accounts.editorUi.mappedTo', { model: mapping[model] })"><SIcon name="chevron-right" class="h-3 w-3 shrink-0" /><span class="truncate font-mono text-[11px]">{{ mapping[model] }}</span></span>
          </span>
        </label>
      </div>
      <p v-else class="px-3 py-6 text-center text-xs text-fg-subtle">{{ catalog.length ? t('accounts.editorUi.noModelMatch') : (emptyText || t('accounts.editorUi.unrestricted')) }}</p>
    </div>
  </div>
</template>
