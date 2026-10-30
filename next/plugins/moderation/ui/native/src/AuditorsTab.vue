<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { isApiError } from '@sub2api/host'
import { SAlert, SBadge, SButton, SCard, SField, SHint, SInput, SModal, SSegmented, SSelect, SSwitch, STable, STextarea, type TableColumn } from '@sub2api/ui'
import CategoryChips from './CategoryChips.vue'
import CostBadge from './CostBadge.vue'
import EnabledBadge from './EnabledBadge.vue'
import JevQuestionsEditor from './JevQuestionsEditor.vue'
import { num } from './format'
import { THRESHOLD_PRESETS, presetThresholds, thresholdPresetOf } from './thresholdPresets'
import {
  canManage,
  categoryLabel,
  deleteAuditor,
  enumLabel,
  errorMessage,
  fetchAuditors,
  fetchChannels,
  fetchDefaults,
  jevPayload,
  money,
  saveAuditor,
  score,
  tryAuditor,
  useModHost,
  type Auditor,
  type AuditorConfig,
  type AuditorType,
  type Channel,
  type Defaults,
  type JevQuestions,
  type TryResult
} from './host'

// Auditors (CONTRACTS §72.6, new-api auditors): OpenAI moderation thresholds
// (with presets), Jev question tables, LLM verdict prompts; each bound to one
// channel of its type, with today's calls and cost. Unsaved edits can be
// tried before saving.
const host = useModHost()
const t = host.t
const manage = computed(() => canManage())

const rows = ref<Auditor[]>([])
const channels = ref<Channel[]>([])
const defaults = ref<Defaults | null>(null)
const loading = ref(false)
const error = ref('')

async function reload() {
  loading.value = true
  error.value = ''
  try {
    ;[rows.value, channels.value] = await Promise.all([fetchAuditors(), fetchChannels()])
    defaults.value ??= await fetchDefaults()
  } catch (e) {
    error.value = errorMessage(e, t('auditors.loadFailed'))
  } finally {
    loading.value = false
  }
}
onMounted(reload)
defineExpose({ reload })

const channelOf = (id: number) => channels.value.find((c) => c.id === id)
const channelTypeOf: Record<AuditorType, string> = { openai_moderation: 'openai_moderation', typesafe: 'typesafe', llm_verdict: 'llm' }

const columns = computed<TableColumn[]>(() => {
  const c: TableColumn[] = [
    { key: 'name', label: t('auditors.col.name'), nowrap: true },
    { key: 'type', label: t('auditors.col.type'), nowrap: true },
    { key: 'channel', label: t('auditors.col.channel') },
    { key: 'summary', label: t('auditors.col.summary') },
    { key: 'today', label: t('auditors.col.today'), align: 'right', nowrap: true },
    { key: 'usable', label: t('auditors.col.usable'), nowrap: true }
  ]
  if (manage.value) c.push({ key: 'actions', label: '', align: 'right' })
  return c
})

function summary(a: Auditor): string {
  const c = a.config || {}
  if (a.type === 'openai_moderation') {
    const preset = defaults.value && thresholdPresetOf(defaults.value, c.thresholds || {})
    return preset ? t(`auditors.preset.${preset}`) : t('auditors.overrides', { n: Object.keys(c.thresholds || {}).length })
  }
  if (a.type === 'typesafe') return `${a.rules_version || ''} · ${t('auditors.questions', { n: c.questions?.items?.length || defaults.value?.default.items.length || 0 })}`
  return c.flag_as_hit ? t('auditors.flagAsHit') : t('auditors.blockOnly')
}

// ---- editor
const typeOptions = computed(() => (['openai_moderation', 'typesafe', 'llm_verdict'] as AuditorType[]).map((v) => ({ value: v, label: t(`auditorType.${v}`) })))
const editOpen = ref(false)
const editing = ref<Auditor | null>(null)
const form = reactive({
  name: '',
  type: 'openai_moderation' as AuditorType,
  channel_id: 0 as number,
  thresholds: {} as Record<string, string>,
  ownQuestions: false,
  questions: { preamble: '', items: [] } as JevQuestions,
  review_images: true,
  system_prompt: '',
  categories: '',
  tool_choice: 'required',
  max_turns: 3 as number | null,
  temperature: 0 as number | null,
  max_tokens: 512 as number | null,
  flag_as_hit: false
})
const formErr = reactive<Record<string, string>>({})
const saving = ref(false)

const channelOptions = computed(() =>
  channels.value
    .filter((c) => c.type === channelTypeOf[form.type])
    .map((c) => ({
      value: c.id,
      label: `${c.name}${c.type === 'llm' && c.protocol ? ` · ${enumLabel('protocol', c.protocol)}` : ''}${c.enabled ? '' : ` (${t('disabled')})`}`
    }))
)

function openEdit(a: Auditor | null) {
  editing.value = a
  for (const k of Object.keys(formErr)) delete formErr[k]
  const c: AuditorConfig = a?.config || {}
  Object.assign(form, {
    name: a?.name || '',
    type: a?.type || 'openai_moderation',
    channel_id: a?.channel_id || 0,
    thresholds: Object.fromEntries(Object.entries(c.thresholds || {}).map(([k, v]) => [k, String(v)])),
    ownQuestions: !!c.questions,
    questions: { preamble: c.questions?.preamble || '', items: (c.questions?.items || []).map((q) => ({ ...q })) },
    review_images: c.review_images !== false,
    system_prompt: c.system_prompt || '',
    categories: (c.categories || []).map((x) => `${x.id}: ${x.description}`).join('\n'),
    tool_choice: c.tool_choice || 'required',
    max_turns: c.max_turns || 3,
    temperature: c.temperature ?? 0,
    max_tokens: c.max_tokens || 512,
    flag_as_hit: !!c.flag_as_hit
  })
  if (!form.channel_id) form.channel_id = Number(channelOptions.value[0]?.value || 0)
  editOpen.value = true
}

function copyDefault() {
  const d = defaults.value?.default
  if (!d) return
  form.ownQuestions = true
  form.questions = { preamble: d.preamble, items: d.items.map((q) => ({ ...q })) }
}

/** The OpenAI overrides of the form (empty inputs keep the default). */
const formThresholds = computed(() =>
  Object.fromEntries(
    Object.entries(form.thresholds)
      .filter(([, v]) => String(v).trim() !== '')
      .map(([k, v]) => [k, Number(v)])
  )
)
const presetOptions = computed(() => THRESHOLD_PRESETS.map((p) => ({ value: p.id, label: t(`auditors.preset.${p.id}`) })))
const formPreset = computed(() => (defaults.value ? thresholdPresetOf(defaults.value, formThresholds.value) : null))
function applyPreset(id: unknown) {
  const p = THRESHOLD_PRESETS.find((x) => x.id === id)
  if (!p || !defaults.value) return
  form.thresholds = Object.fromEntries(Object.entries(presetThresholds(defaults.value, p.factor)).map(([k, v]) => [k, String(v)]))
}

function config(): AuditorConfig {
  if (form.type === 'openai_moderation') return { thresholds: formThresholds.value }
  if (form.type === 'typesafe') return { review_images: form.review_images, questions: form.ownQuestions ? jevPayload(form.questions) : null }
  const cats = form.categories
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.search(/[:：]/)
      return i < 0 ? { id: l, description: '' } : { id: l.slice(0, i).trim(), description: l.slice(i + 1).trim() }
    })
  return {
    system_prompt: form.system_prompt,
    categories: cats,
    tool_choice: form.tool_choice,
    max_turns: Number(form.max_turns) || 3,
    temperature: Number(form.temperature) || 0,
    max_tokens: Number(form.max_tokens) || 512,
    flag_as_hit: form.flag_as_hit
  }
}

const draft = () => ({ name: form.name, type: form.type, channel_id: Number(form.channel_id), config: config() })

async function save() {
  for (const k of Object.keys(formErr)) delete formErr[k]
  saving.value = true
  try {
    await saveAuditor(editing.value?.id ?? null, draft())
    host.toast(t('saved'), 'success')
    editOpen.value = false
    reload()
  } catch (e) {
    const fields = isApiError(e) ? e.fields : {}
    Object.assign(formErr, fields)
    if (!Object.keys(fields).length) host.toast(errorMessage(e, t('actionFailed')), 'error')
  } finally {
    saving.value = false
  }
}

async function remove(a: Auditor) {
  const ok = await host.confirm({ message: t('auditors.deleteConfirm', { name: a.name }), danger: true, confirmText: t('delete') })
  if (!ok) return
  try {
    await deleteAuditor(a.id)
    host.toast(t('deleted'), 'success')
    reload()
  } catch (e) {
    host.toast(errorMessage(e, t('actionFailed')), 'error')
  }
}

// ---- try: a stored auditor from its row, or the editor's unsaved edits (draft)
const tryOpen = ref(false)
const tryTarget = ref<{ id: number | null; name: string; draft?: ReturnType<typeof draft> } | null>(null)
const tryText = ref('')
const tryImages = ref('')
const tryResult = ref<TryResult | null>(null)
const trying = ref(false)
function openTry(target: NonNullable<typeof tryTarget.value>) {
  tryTarget.value = target
  tryResult.value = null
  tryOpen.value = true
}
async function runTry() {
  const a = tryTarget.value
  if (!a) return
  trying.value = true
  tryResult.value = null
  try {
    const images = tryImages.value.split('\n').map((s) => s.trim()).filter(Boolean)
    tryResult.value = await tryAuditor(a.id, tryText.value, images, a.draft)
  } catch (e) {
    host.toast(errorMessage(e, t('actionFailed')), 'error')
  } finally {
    trying.value = false
  }
}
const tryScores = computed(() =>
  Object.entries(tryResult.value?.scores || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
)
</script>

<template>
  <div>
    <SHint class="mod-hint">{{ t('auditors.hint') }}</SHint>
    <div v-if="manage" class="mod-toolbar">
      <SButton variant="primary" icon="plus" :disabled="!channels.length" :title="channels.length ? '' : t('auditors.needChannel')" @click="openEdit(null)">{{ t('auditors.add') }}</SButton>
    </div>
    <SAlert v-if="error" tone="danger" class="mod-block">{{ error }}</SAlert>

    <SCard :padded="false">
      <STable :columns="columns" :rows="rows" :loading="loading" :empty-text="t('auditors.empty')" dense>
        <template #cell-name="{ row }">{{ row.name }} <span class="mod-sub mod-num">#{{ row.id }}</span></template>
        <template #cell-type="{ row }">{{ enumLabel('auditorType', row.type) }}</template>
        <template #cell-channel="{ row }">
          {{ row.channel_name || channelOf(row.channel_id)?.name || `#${row.channel_id}` }}
          <EnabledBadge v-if="!(row.channel_enabled ?? channelOf(row.channel_id)?.enabled)" :enabled="false" :missing="!row.channel_name && !channelOf(row.channel_id)" size="xs" />
        </template>
        <template #cell-summary="{ row }">{{ summary(row) }}</template>
        <template #cell-today="{ row }">
          <template v-if="row.today?.calls">
            <span class="mod-num">{{ money(row.today.cost.cost) }}</span>
            <div class="mod-sub mod-num">
              {{ t('cost.calls', { n: num(row.today.calls) }) }}<template v-if="row.today.cost.unpriced_calls"> · {{ t('channels.unpricedN', { n: num(row.today.cost.unpriced_calls) }) }}</template>
            </div>
          </template>
          <SHint v-else inline>—</SHint>
        </template>
        <template #cell-usable="{ row }">
          <SBadge :tone="row.usable ? 'success' : 'warning'" dot>{{ row.usable ? t('auditors.ready') : t('auditors.notReady') }}</SBadge>
        </template>
        <template #cell-actions="{ row }">
          <SButton size="sm" variant="ghost" @click="openTry({ id: row.id, name: row.name })">{{ t('auditors.try') }}</SButton>
          <SButton size="sm" variant="ghost" @click="openEdit(row)">{{ t('edit') }}</SButton>
          <SButton size="sm" variant="ghost" @click="remove(row)">{{ t('delete') }}</SButton>
        </template>
      </STable>
    </SCard>

    <SModal v-model:open="editOpen" :title="editing ? t('auditors.editTitle', { name: editing.name }) : t('auditors.add')" width="2xl">
      <form class="mod-form" @submit.prevent="save">
        <div class="mod-form-row">
          <SField :label="t('auditors.col.name')" required :error="formErr.name">
            <SInput v-model="form.name" :maxlength="64" />
          </SField>
          <SField :label="t('auditors.col.type')" :error="formErr.type">
            <SSelect v-model="form.type" :options="typeOptions" :disabled="!!editing" @update:model-value="form.channel_id = Number(channelOptions[0]?.value || 0)" />
          </SField>
          <SField :label="t('auditors.col.channel')" required :error="formErr.channel_id" :hint="channelOptions.length ? '' : t('auditors.noChannelOfType')">
            <SSelect v-model="form.channel_id" :options="channelOptions" />
          </SField>
        </div>
        <SAlert v-if="formErr.config" tone="danger" dense>{{ formErr.config }}</SAlert>

        <template v-if="form.type === 'openai_moderation'">
          <div class="mod-inline mod-gap">
            <SSegmented :model-value="formPreset ?? ''" :options="presetOptions" size="sm" @update:model-value="applyPreset" />
            <SBadge v-if="!formPreset" tone="info" size="xs">{{ t('auditors.preset.custom') }}</SBadge>
          </div>
          <SHint size="xs">{{ t('auditors.thresholdsHint') }}</SHint>
          <div class="mod-threshold-grid">
            <SField v-for="c in defaults?.openai_categories || []" :key="c" :label="categoryLabel(c)" size="sm">
              <SInput v-model="form.thresholds[c]" type="number" min="0.01" max="1" step="0.01" size="sm" :placeholder="String(defaults?.openai_thresholds[c] ?? '')" />
            </SField>
          </div>
        </template>

        <template v-else-if="form.type === 'typesafe'">
          <SField :label="t('auditors.reviewImages')" :hint="t('auditors.reviewImagesHint')">
            <SSwitch v-model="form.review_images" />
          </SField>
          <SField :label="t('auditors.ownQuestions')" :hint="form.ownQuestions ? '' : t('auditors.useDefault', { v: defaults?.default_version || '' })">
            <SSwitch v-model="form.ownQuestions" />
          </SField>
          <JevQuestionsEditor v-if="form.ownQuestions" v-model="form.questions">
            <template #toolbar><SButton size="sm" @click="copyDefault">{{ t('auditors.copyDefault') }}</SButton></template>
          </JevQuestionsEditor>
          <SHint v-if="editing?.rules_version" size="xs">{{ t('auditors.rulesVersion', { v: editing.rules_version }) }}</SHint>
        </template>

        <template v-else>
          <SField :label="t('auditors.systemPrompt')" :hint="t('auditors.systemPromptHint')">
            <STextarea v-model="form.system_prompt" :rows="6" :placeholder="defaults?.llm_system_prompt.slice(0, 200) + '…'" />
          </SField>
          <SField :label="t('auditors.categories')" :hint="t('auditors.categoriesHint')">
            <STextarea v-model="form.categories" :rows="4" :placeholder="(defaults?.llm_categories || []).slice(0, 3).map((c) => `${c.id}: ${c.description}`).join('\n')" />
          </SField>
          <div class="mod-form-row">
            <SField :label="t('auditors.toolChoice')">
              <SSelect v-model="form.tool_choice" :options="['required', 'function', 'auto'].map((v) => ({ value: v, label: v }))" />
            </SField>
            <SField :label="t('auditors.maxTurns')"><SInput v-model="form.max_turns" type="number" min="1" max="5" /></SField>
            <SField :label="t('auditors.temperature')"><SInput v-model="form.temperature" type="number" min="0" max="2" step="0.1" /></SField>
            <SField :label="t('auditors.maxTokens')"><SInput v-model="form.max_tokens" type="number" min="64" max="4096" /></SField>
          </div>
          <SField :label="t('auditors.flagAsHitLabel')" :hint="t('auditors.flagAsHitHint')">
            <SSwitch v-model="form.flag_as_hit" />
          </SField>
        </template>
      </form>
      <template #footer>
        <SButton icon="play" :disabled="!form.channel_id" @click="openTry({ id: editing?.id ?? null, name: form.name || t('auditors.unsaved'), draft: draft() })">{{ t('auditors.tryDraft') }}</SButton>
        <SButton @click="editOpen = false">{{ host.i18n.t('ui.cancel') }}</SButton>
        <SButton variant="primary" :loading="saving" @click="save">{{ t('save') }}</SButton>
      </template>
    </SModal>

    <SModal v-model:open="tryOpen" :title="t('auditors.tryTitle', { name: tryTarget?.name || '' })" width="lg">
      <div class="mod-form">
        <SHint size="xs">{{ t('auditors.tryHint') }}</SHint>
        <STextarea v-model="tryText" :rows="5" :placeholder="t('test.placeholder')" />
        <SField :label="t('test.images')" :hint="t('test.imagesHint')">
          <STextarea v-model="tryImages" :rows="2" />
        </SField>
        <div v-if="tryResult" class="mod-verdict">
          <div class="mod-verdict-head">
            <SBadge v-if="tryResult.error" tone="warning">{{ enumLabel('err', tryResult.err) }} {{ tryResult.status || '' }}</SBadge>
            <SBadge v-else-if="tryResult.skipped" tone="gray">{{ t('trace.skipped') }}</SBadge>
            <SBadge v-else :tone="tryResult.hit ? 'danger' : 'success'">{{ tryResult.hit ? t('trace.hit') : t('trace.pass') }}</SBadge>
            <SHint inline size="xs">{{ t('ms', { n: tryResult.latency_ms }) }} · {{ tryResult.model || '' }}</SHint>
            <CostBadge :cost="tryResult.cost" class="mod-ml-auto" />
          </div>
          <SAlert v-if="tryResult.error" tone="danger" dense>{{ tryResult.error }}</SAlert>
          <CategoryChips v-if="tryResult.hits?.length" :categories="tryResult.hits" wrap />
          <div v-if="tryResult.reason" class="mod-sub">{{ tryResult.reason }}</div>
          <ul v-if="tryScores.length" class="mod-scores">
            <li v-for="[c, s] in tryScores" :key="c"><span>{{ categoryLabel(c) }}</span><span class="mod-num">{{ score(s) }}</span></li>
          </ul>
        </div>
      </div>
      <template #footer>
        <SButton @click="tryOpen = false">{{ host.i18n.t('ui.close') }}</SButton>
        <SButton variant="primary" icon="play" :loading="trying" :disabled="!tryText.trim() && !tryImages.trim()" @click="runTry">{{ t('test.run') }}</SButton>
      </template>
    </SModal>
  </div>
</template>
