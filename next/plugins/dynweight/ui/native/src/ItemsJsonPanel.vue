<script setup lang="ts">
import { onBeforeUnmount, ref, watch, watchEffect } from 'vue'
import { SField, STextarea } from '@sub2api/ui'
import { describeProblem } from './describe'
import { validateLists } from './items'
import { useDwHost, type Rule, type Strategy } from './host'

// JSON mode of a layer's items: the rules and strategies arrays as text.
// Both texts parse and pass the plugin's checks (validateLists) or neither
// goes into the model: the errors are listed under their text, `invalid` is
// set and the model keeps its last good value. A change to the model from
// elsewhere (restoring the defaults, the visual editor, discard) replaces the
// texts; the model following the texts does not, so typing is never
// reformatted.
const model = defineModel<{ rules: Rule[]; strategies: Strategy[] }>({ required: true })
const invalid = defineModel<boolean>('invalid', { default: false })
withDefaults(defineProps<{ rows?: number }>(), { rows: 14 })
const t = useDwHost().t

type Part = 'rules' | 'strategies'
const parts: Part[] = ['rules', 'strategies']
const text = ref<Record<Part, string>>({ rules: '', strategies: '' })
const errors = ref<Record<Part, string[]>>({ rules: [], strategies: [] })
// What the texts last put into the model (compact JSON of both lists).
let applied = ''
const current = () => JSON.stringify([model.value.rules, model.value.strategies])

watch(
  () => [model.value, current()] as const,
  ([of, now], old) => {
    if (old && of === old[0] && now === applied) return
    applied = now
    for (const part of parts) text.value[part] = JSON.stringify(model.value[part], null, 2)
    errors.value = { rules: [], strategies: [] }
  },
  { immediate: true }
)

watchEffect(() => (invalid.value = parts.some((p) => errors.value[p].length > 0)))
// The model keeps its last good value once the panel is gone.
onBeforeUnmount(() => (invalid.value = false))

type Item = Record<string, unknown>
const isItem = (x: unknown): x is Item => !!x && typeof x === 'object' && !Array.isArray(x)

/** A trigger: a rule name, or {all: [...]} / {any: [...]} of triggers. */
function isWhen(w: unknown): boolean {
  if (typeof w === 'string') return true
  if (!isItem(w)) return false
  const keys = Object.keys(w)
  return keys.length === 1 && (keys[0] === 'all' || keys[0] === 'any') && Array.isArray(w[keys[0]]) && (w[keys[0]] as unknown[]).every(isWhen)
}

/** The malformed field of an item ('' when none), filling a missing list. */
function listField(x: Item, field: string): string {
  x[field] ??= []
  const list = x[field]
  return Array.isArray(list) && list.every(isItem) ? '' : field
}

// The shapes the editors read: lists of objects and well-formed triggers; the
// values themselves are for validateLists.
const malformed: Record<Part, (x: Item) => string> = {
  rules: (x) => listField(x, 'conditions'),
  strategies: (x) => {
    x.when ??= null
    return x.when !== null && !isWhen(x.when) ? 'when' : listField(x, 'actions')
  }
}

/** The array of a text, or the error that keeps it out. */
function parse(part: Part, value: string): { list?: Item[]; error?: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch (e) {
    return { error: (e as Error).message }
  }
  if (!Array.isArray(parsed)) return { error: t('json.notArray') }
  for (const [i, x] of parsed.entries()) {
    if (!isItem(x) || typeof x.name !== 'string') return { error: t('json.unnamed', { i: i + 1 }) }
    const field = malformed[part](x)
    if (field) return { error: t('json.malformed', { i: i + 1, field }) }
  }
  return { list: parsed }
}

function edit(part: Part, value: string) {
  text.value[part] = value
  const rules = parse('rules', text.value.rules)
  const strategies = parse('strategies', text.value.strategies)
  errors.value = { rules: rules.error ? [rules.error] : [], strategies: strategies.error ? [strategies.error] : [] }
  if (!rules.list || !strategies.list) return
  const next = { rules: rules.list as unknown as Rule[], strategies: strategies.list as unknown as Strategy[] }
  for (const p of validateLists(next.rules, next.strategies)) errors.value[p.part].push(describeProblem(p, t))
  if (errors.value.rules.length || errors.value.strategies.length) return
  applied = JSON.stringify([next.rules, next.strategies])
  model.value.rules = next.rules
  model.value.strategies = next.strategies
}
</script>

<template>
  <div class="dw-it-json">
    <SField v-for="part in parts" :key="part" :label="t(`it.json.${part}`)" :hint="t(`json.${part}Hint`)">
      <STextarea :model-value="text[part]" :rows="rows" mono size="sm" :error="errors[part].length > 0" @update:model-value="edit(part, $event)" />
      <ul v-if="errors[part].length" class="dw-it-errors" role="alert">
        <li v-for="(e, i) in errors[part].slice(0, 5)" :key="i">{{ e }}</li>
      </ul>
    </SField>
  </div>
</template>
