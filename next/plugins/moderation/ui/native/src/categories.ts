import { computed, ref } from 'vue'
import type { SelectOption } from '@sub2api/ui'
import { useCatalog } from './catalog'
import { categoryLabel } from './format'
import { fetchCategoryStats, fetchDefaults } from './host'

// Categories the record and watch list filters offer: the OpenAI and LLM
// categories and the built-in / default Jev questions (GET
// /jev/default-questions), today's categories (GET /stats/categories) and
// the questions and categories of the auditors. Loaded once per page.

/** category id → Jev label ('' when the category has none) */
const loaded = ref(new Map<string, string>())
let loading: Promise<void> | null = null

const addTo = (m: Map<string, string>, id: string | undefined, label = '') => {
  if (id && !m.get(id)) m.set(id, label)
}

async function load() {
  const [d, s] = await Promise.all([fetchDefaults().catch(() => null), fetchCategoryStats().catch(() => null)])
  const m = new Map<string, string>()
  for (const id of d?.openai_categories || []) addTo(m, id)
  for (const q of [...(d?.builtin.items || []), ...(d?.default.items || [])]) addTo(m, q.category, q.label)
  for (const c of d?.llm_categories || []) addTo(m, c.id)
  for (const c of s?.items || []) addTo(m, c.category, c.label)
  loaded.value = m
}

/** Select options of every known category, by label. */
export function useCategoryOptions() {
  const catalog = useCatalog()
  loading ??= load()
  return computed<SelectOption[]>(() => {
    const m = new Map(loaded.value)
    for (const a of catalog.state.auditors) {
      for (const q of a.config?.questions?.items || []) addTo(m, q.category, q.label)
      for (const c of a.config?.categories || []) addTo(m, c.id)
    }
    return [...m]
      .map(([id, label]) => ({ value: id, label: categoryLabel(id, label) }))
      .sort((x, y) => x.label.localeCompare(y.label))
  })
}
