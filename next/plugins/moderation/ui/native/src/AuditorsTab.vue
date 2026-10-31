<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { isApiError } from '@sub2api/host'
import { SAlert, SBadge, SButton, SCard, SDisclosure, SField, SHint, SInput, SModal, SSelect, SSwitch, STable, STextarea, type TableColumn } from '@sub2api/ui'
import AuditorTryPanel from './pages/AuditorTryPanel.vue'
import CostSummaryText from './pages/CostSummaryText.vue'
import ThresholdsEditor from './pages/ThresholdsEditor.vue'
import { prime } from './pages/catalog'
import { parseThresholds, thresholdPresetOf } from './pages/thresholds'
import {
  canManage,
  categoryLabel,
  deleteAuditor,
  enumLabel,
  errorMessage,
  fetchAuditors,
  fetchChannels,
  fetchDefaults,
  saveAuditor,
  useModHost,
  type Auditor,
  type AuditorConfig,
  type AuditorDraft,
  type AuditorType,
  type Channel,
  type Defaults,
  type JevQuestion
} from './host'

// Auditors (CONTRACTS §72.6, §72.14.3): OpenAI moderation thresholds (with
// presets), Jev question tables, LLM verdict prompts; each bound to one
// channel of its type. The editor tries the unsaved form.
const host = useModHost()
const t = host.t
const n = (v: number | undefined | null) => host.i18n.formatNumber(v ?? 0)
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
    prime('auditors', rows.value)
    prime('channels', channels.value)
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
    { key: 'calls', label: t('pagesP3.auditors.calls'), align: 'right', nowrap: true },
    { key: 'cost', label: t('pagesP3.auditors.cost'), align: 'right', nowrap: true },
    { key: 'usable', label: t('auditors.col.usable'), nowrap: true }
  ]
  if (manage.value) c.push({ key: 'actions', label: '', align: 'right' })
  return c
})

const openaiCats = computed(() => defaults.value?.openai_categories || [])
const openaiDefaults = computed(() => defaults.value?.openai_thresholds || {})

function summary(a: Auditor): string {
  const c = a.config || {}
  if (a.type === 'openai_moderation') {
    const p = thresholdPresetOf(c.thresholds || {}, openaiCats.value, openaiDefaults.value)
    return t('pagesP3.auditors.thresholds', { n: openaiCats.value.length, preset: t(`pagesP3.preset.${p || 'custom'}`) })
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
  preamble: '',
  questions: [] as JevQuestion[],
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
    preamble: c.questions?.preamble || '',
    questions: (c.questions?.items || []).map((q) => ({ ...q })),
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
  form.preamble = d.preamble
  form.questions = d.items.map((q) => ({ ...q }))
}

function config(): AuditorConfig {
  if (form.type === 'openai_moderation') return { thresholds: parseThresholds(form.thresholds) }
  if (form.type === 'typesafe') {
    const items = form.questions.map((q) => {
      const out: JevQuestion = { ...q, threshold: Number(q.threshold) }
      if (!out.answer_yes?.trim()) delete out.answer_yes
      if (!out.answer_no?.trim()) delete out.answer_no
      return out
    })
    return { review_images: form.review_images, questions: form.ownQuestions ? { preamble: form.preamble, items } : null }
  }
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

async function save() {
  for (const k of Object.keys(formErr)) delete formErr[k]
  saving.value = true
  try {
    await saveAuditor(editing.value?.id ?? null, { name: form.name, type: form.type, channel_id: Number(form.channel_id), config: config() })
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

// ---- try: saved auditors from the list; the unsaved form inside the editor
// (§72.14.3: id 0 = a whole draft, otherwise the draft overrides the stored fields).
const tryOpen = ref(false)
const tryTarget = ref<Auditor | null>(null)
function openTry(a: Auditor) {
  tryTarget.value = a
  tryOpen.value = true
}
const draft = computed<AuditorDraft>(() => {
  const d: AuditorDraft = { channel_id: Number(form.channel_id), config: config() }
  return editing.value ? d : { name: form.name || t('auditors.add'), type: form.type, ...d }
})
const tryBlocked = computed(() => (form.channel_id ? '' : t('pagesP3.try.needChannel')))
const tryKey = ref(0)
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
          <template v-if="channelOf(row.channel_id)">
            <span>{{ channelOf(row.channel_id)!.name }}</span>
            <span class="mod-sub mod-num"> #{{ row.channel_id }}</span>
            <SBadge size="xs" :tone="channelOf(row.channel_id)!.enabled ? 'success' : 'gray'" class="mod-ml">{{ channelOf(row.channel_id)!.enabled ? t('enabled') : t('disabled') }}</SBadge>
            <div v-if="!channelOf(row.channel_id)!.enabled" class="mod-sub mod-danger">{{ t('pagesP3.auditors.callsFail') }}</div>
            <div v-else-if="channelOf(row.channel_id)!.model" class="mod-sub">{{ channelOf(row.channel_id)!.model }}</div>
          </template>
          <SBadge v-else tone="danger" :title="t('pagesP3.auditors.channelMissingHint')">{{ t('pagesP3.auditors.channelMissing') }}</SBadge>
        </template>
        <template #cell-summary="{ row }">{{ summary(row) }}</template>
        <template #cell-calls="{ row }"><span class="mod-num">{{ n(row.today?.calls) }}</span></template>
        <template #cell-cost="{ row }"><CostSummaryText :summary="row.today?.cost" /></template>
        <template #cell-usable="{ row }">
          <SBadge :tone="row.usable ? 'success' : 'warning'" dot>{{ row.usable ? t('auditors.ready') : t('auditors.notReady') }}</SBadge>
        </template>
        <template #cell-actions="{ row }">
          <SButton size="sm" variant="ghost" @click="openTry(row)">{{ t('auditors.try') }}</SButton>
          <SButton size="sm" variant="ghost" @click="openEdit(row)">{{ t('edit') }}</SButton>
          <SButton size="sm" variant="ghost" @click="remove(row)">{{ t('delete') }}</SButton>
        </template>
      </STable>
    </SCard>

    <SModal v-model:open="editOpen" :title="editing ? t('auditors.editTitle', { name: editing.name }) : t('auditors.add')" width="2xl" @update:open="$event && tryKey++">
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
          <SHint size="xs">{{ t('auditors.thresholdsHint') }}</SHint>
          <ThresholdsEditor v-model="form.thresholds" :categories="openaiCats" :defaults="openaiDefaults" />
        </template>

        <template v-else-if="form.type === 'typesafe'">
          <SField :label="t('auditors.reviewImages')" :hint="t('auditors.reviewImagesHint')">
            <SSwitch v-model="form.review_images" />
          </SField>
          <SField :label="t('auditors.ownQuestions')" :hint="form.ownQuestions ? '' : t('auditors.useDefault', { v: defaults?.default_version || '' })">
            <SSwitch v-model="form.ownQuestions" />
          </SField>
          <SDisclosure v-if="!form.ownQuestions && defaults" :label="t('pagesP3.jev.defaultTable', { n: defaults.default.items.length })">
            <ol class="mod-pg-jev-list">
              <li v-for="q in defaults.default.items" :key="q.category">
                <div><b>{{ categoryLabel(q.category, q.label) }}</b> <code class="mod-code">{{ q.category }}</code> <span class="mod-sub mod-num">{{ t('auditors.threshold') }} {{ q.threshold }}</span></div>
                <div class="mod-sub mod-prewrap">{{ q.question }}</div>
                <div v-if="q.answer_yes" class="mod-sub">{{ t('pagesP3.jev.yes') }}：{{ q.answer_yes }}</div>
                <div v-if="q.answer_no" class="mod-sub">{{ t('pagesP3.jev.no') }}：{{ q.answer_no }}</div>
              </li>
            </ol>
          </SDisclosure>
          <template v-if="form.ownQuestions">
            <div class="mod-toolbar">
              <SButton size="sm" @click="copyDefault">{{ t('auditors.copyDefault') }}</SButton>
              <SButton size="sm" icon="plus" @click="form.questions.push({ category: 'custom/', label: '', question: '', answer_yes: '', answer_no: '', threshold: 0.85 })">{{ t('auditors.addQuestion') }}</SButton>
            </div>
            <SField :label="t('auditors.preamble')">
              <STextarea v-model="form.preamble" :rows="3" />
            </SField>
            <div v-for="(q, i) in form.questions" :key="i" class="mod-question">
              <div class="mod-form-row">
                <SField :label="t('auditors.category')" size="sm"><SInput v-model="q.category" size="sm" /></SField>
                <SField :label="t('auditors.label')" size="sm"><SInput v-model="q.label" size="sm" :placeholder="categoryLabel(q.category)" /></SField>
                <SField :label="t('auditors.threshold')" size="sm"><SInput v-model="q.threshold" type="number" min="0.01" max="1" step="0.01" size="sm" /></SField>
                <SButton size="sm" variant="ghost" icon="trash" :aria-label="t('delete')" @click="form.questions.splice(i, 1)" />
              </div>
              <STextarea v-model="q.question" :rows="2" :placeholder="t('auditors.question')" />
              <SDisclosure :label="t('pagesP3.jev.criteria')" :default-open="!!(q.answer_yes || q.answer_no)">
                <div class="mod-form-row">
                  <SField :label="t('pagesP3.jev.yes')" size="sm"><SInput v-model="q.answer_yes" size="sm" :placeholder="t('pagesP3.jev.yesPh')" /></SField>
                  <SField :label="t('pagesP3.jev.no')" size="sm"><SInput v-model="q.answer_no" size="sm" :placeholder="t('pagesP3.jev.noPh')" /></SField>
                </div>
              </SDisclosure>
            </div>
          </template>
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

        <SDisclosure v-if="manage" :label="t('pagesP3.try.draft')" variant="section">
          <AuditorTryPanel :key="tryKey" :auditor-id="editing?.id ?? 0" :draft="draft" :blocked="tryBlocked" />
        </SDisclosure>
      </form>
      <template #footer>
        <SButton @click="editOpen = false">{{ host.i18n.t('ui.cancel') }}</SButton>
        <SButton v-if="manage" variant="primary" :loading="saving" @click="save">{{ t('save') }}</SButton>
      </template>
    </SModal>

    <SModal v-model:open="tryOpen" :title="t('auditors.tryTitle', { name: tryTarget?.name || '' })" width="lg">
      <AuditorTryPanel v-if="tryTarget && tryOpen" :auditor-id="tryTarget.id" />
      <template #footer>
        <SButton @click="tryOpen = false">{{ host.i18n.t('ui.close') }}</SButton>
      </template>
    </SModal>
  </div>
</template>

<style scoped>
.mod-pg-jev-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.8125rem;
}
</style>
