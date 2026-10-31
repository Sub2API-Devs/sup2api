<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { SAlert, SButton, SCard, SCode, SField, SHint, SInput, SLink, SSegmented, SSelect, SSpinner } from '@sub2api/ui'
import JevQuestionsEditor from './JevQuestionsEditor.vue'
import { BLOCK_FORMATS, blockResponse, type BlockFormat } from './blockPreview'
import { useCatalog } from './catalog'
import { enumOptions, joinList } from './format'
import { applyErrorsOrToast, clearErrors, type FieldErrors } from './forms'
import { mergeSettings, type PageValues } from './settingsMerge'
import { useAsync } from './useAsync'
import { fetchDefaults, fetchPluginSettings, jevPayload, savePluginSettings, SETTINGS_MASK, settingsPath, useModHost } from './host'
import type { JevQuestions } from './types'

// The moderation settings of the console (new-api settings page): the block
// response with a preview per API format, the AI analysis channel, the
// error-rate alert, statistics retention, the notification webhook and the
// Jev default question set. The other settings stay on the plugin's schema
// form; a save re-reads the stored values and writes back only the keys of
// this page edited since it loaded (settingsMerge.ts), so a change made
// elsewhere meanwhile is kept, also to a key of this page left alone (the
// core settings API has no version to compare). A key someone else changed
// that this page changed too is confirmed first, then this page's value
// wins. A key left empty is not stored, so the schema default (shown as
// placeholder) applies.
const host = useModHost()
const t = host.t
const catalog = useCatalog()

const KEYS = ['block_status', 'block_message', 'analysis_channel_id', 'error_rate_alert_percent', 'stats_retention_days', 'notify_webhook_url', 'notify_webhook_secret'] as const
type Key = (typeof KEYS)[number]
const NUMBERS: readonly Key[] = ['block_status', 'analysis_channel_id', 'error_rate_alert_percent', 'stats_retention_days']
const SECRETS: readonly Key[] = ['notify_webhook_url', 'notify_webhook_secret']
/** Keys with an input here; errors on other keys are toasted. */
const SHOWN = [...KEYS, 'jev_default_set']
/** The label of a key of this page (conflict confirmation). */
const LABEL: Record<string, string> = {
  block_status: 'settingsTab.blockStatus',
  block_message: 'settingsTab.blockMessage',
  analysis_channel_id: 'settingsTab.analysisChannel',
  error_rate_alert_percent: 'settingsTab.errorRateAlert',
  stats_retention_days: 'settingsTab.statsRetention',
  notify_webhook_url: 'settingsTab.webhookUrl',
  notify_webhook_secret: 'settingsTab.webhookSecret',
  jev_default_set: 'settingsTab.jev'
}
/** The settings key of an API field path: "values.<key>[.<path>]", "values/<key>/…" or "<key>". */
const settingsKey = (path: string) =>
  path
    .replace(/^values(?=[./]|$)/, '')
    .replace(/^[./]/, '')
    .replace(/\//g, '.')
    .split(/[.[]/)[0]

const form = reactive(Object.fromEntries(KEYS.map((k) => [k, ''])) as Record<Key, string | number | null>)
/** secret keys with a stored value, kept while their input stays empty */
const kept = reactive<Partial<Record<Key, boolean>>>({})
const jev = ref<JevQuestions | null>(null)
const errs = reactive<FieldErrors>({})
const saving = ref(false)

const copyQuestions = (q: JevQuestions): JevQuestions => ({ preamble: q.preamble || '', items: q.items.map((x) => ({ ...x })) })
/** The stored values and this page's values when it loaded (what a save compares with). */
let loaded: Record<string, unknown> = {}
let initial: PageValues = {}

const { data, loading, error, reload } = useAsync(() => Promise.all([fetchPluginSettings(), fetchDefaults()]), () => t('settingsTab.loadFailed'))
const defaults = computed(() => data.value?.[1] ?? null)
/** The schema default of a key, as the placeholder of its empty input. */
const schemaDefault = (k: Key) => {
  const v = data.value?.[0].schema?.properties?.[k]?.default
  return typeof v === 'number' || typeof v === 'string' ? v : ''
}
watch(data, (v) => {
  if (!v) return
  const stored = v[0].values || {}
  for (const k of KEYS) kept[k] = stored[k] === SETTINGS_MASK
  const value = (k: Key) => {
    const x = stored[k]
    return kept[k] || (typeof x !== 'number' && typeof x !== 'string') ? '' : x
  }
  Object.assign(form, Object.fromEntries(KEYS.map((k) => [k, value(k)])))
  // the select has no empty choice: an unset channel shows its default
  if (form.analysis_channel_id === '') form.analysis_channel_id = Number(schemaDefault('analysis_channel_id')) || 0
  const set = stored.jev_default_set as JevQuestions | null | undefined
  jev.value = set ? copyQuestions(set) : null
  loaded = { ...stored }
  initial = pageValues()
})
onMounted(reload)
defineExpose({ reload })

/** A secret as sent: the new value, the mask to keep the stored one, or '' to clear it. */
const secretValue = (k: Key) => (form[k] ? String(form[k]) : kept[k] ? SETTINGS_MASK : '')

/** The keys of this page as sent; an empty key is undefined (removed, its default applies). */
function pageValues(): PageValues {
  const out: PageValues = { jev_default_set: jev.value && jevPayload(jev.value) }
  for (const k of KEYS) {
    const v = SECRETS.includes(k) ? secretValue(k) : String(form[k] ?? '').trim()
    out[k] = v === '' ? undefined : NUMBERS.includes(k) ? Number(v) : v
  }
  return out
}

async function save() {
  clearErrors(errs)
  saving.value = true
  try {
    const latest = await fetchPluginSettings()
    const m = mergeSettings(SHOWN, loaded, latest.values || {}, initial, pageValues())
    if (!m.changed.length) {
      host.toast(t('settingsTab.noChanges'), 'info')
      return
    }
    if (m.conflicts.length) {
      const keys = joinList(m.conflicts.map((k) => t(LABEL[k] || k)))
      if (!(await host.confirm({ message: t('settingsTab.conflictConfirm', { keys }), confirmText: t('settingsTab.overwrite') }))) return
    }
    await savePluginSettings(m.values)
    host.toast(t('saved'), 'success')
    await reload()
  } catch (e) {
    // The first error of a key is shown at its input; others are toasted.
    applyErrorsOrToast(errs, e, SHOWN, settingsKey)
  } finally {
    saving.value = false
  }
}

const format = ref<BlockFormat>('openai')
const formatOptions = computed(() => enumOptions('settingsTab.format', BLOCK_FORMATS))
/** The block response as sent, empty inputs taking their defaults. */
const preview = computed(() =>
  blockResponse(format.value, Number(form.block_status || schemaDefault('block_status')), String(form.block_message || schemaDefault('block_message')))
)

const channelOptions = computed(() => [
  { value: 0, label: t('settingsTab.noAnalysis') },
  ...catalog.state.channels.filter((c) => c.type === 'llm').map((c) => ({ value: c.id, label: c.enabled ? c.name : `${c.name} (${t('disabled')})` }))
])
/** The analysis channel is not a usable llm channel (status channel_problem): the server leaves analyses off. */
const channelError = computed(() => {
  const id = Number(form.analysis_channel_id) || 0
  if (errs.analysis_channel_id || !id || !catalog.state.loaded) return errs.analysis_channel_id || ''
  const ch = catalog.state.channels.find((c) => c.id === id && c.type === 'llm')
  if (!ch) return t('settingsTab.analysisChannelInvalid', { id })
  return ch.enabled ? '' : t('statusLine.analysisProblem.unusable')
})

const jevMode = computed({
  get: () => (jev.value ? 'custom' : 'builtin'),
  set: (m: string) => (jev.value = m === 'custom' && defaults.value ? copyQuestions(defaults.value.builtin) : null)
})
const jevOptions = computed(() => [
  { value: 'builtin', label: t('settingsTab.jevBuiltin', { v: defaults.value?.builtin_version || '' }) },
  { value: 'custom', label: t('settingsTab.jevCustom') }
])
</script>

<template>
  <div>
    <SHint class="mod-hint">
      {{ t('settingsTab.hint') }}
      <SLink as="button" @click="host.router.push(settingsPath())">{{ t('settingsAll') }}</SLink>
    </SHint>
    <SSpinner v-if="loading && !defaults" block />
    <SAlert v-else-if="error" tone="danger">{{ error }}</SAlert>
    <form v-else class="mod-form mod-form-page" @submit.prevent="save">
      <SCard :title="t('settingsTab.block')" :subtitle="t('settingsTab.blockHint')">
        <div class="mod-form">
          <div class="mod-form-row">
            <SField :label="t('settingsTab.blockStatus')" :error="errs.block_status">
              <SInput v-model="form.block_status" type="number" min="400" max="599" :placeholder="String(schemaDefault('block_status'))" />
            </SField>
            <SField :label="t('settingsTab.blockMessage')" :error="errs.block_message">
              <SInput v-model="form.block_message" :maxlength="500" :placeholder="String(schemaDefault('block_message'))" />
            </SField>
          </div>
          <SSegmented v-model="format" :options="formatOptions" size="sm" />
          <SCode :text="`HTTP ${preview.status}\n${preview.body}`" class="mod-text-block" />
          <SHint size="xs">{{ t('settingsTab.streamNote') }}</SHint>
        </div>
      </SCard>

      <SCard :title="t('settingsTab.analysis')">
        <SField :label="t('settingsTab.analysisChannel')" :hint="t('settingsTab.analysisChannelHint')" :error="channelError">
          <SSelect v-model="form.analysis_channel_id" :options="channelOptions" />
        </SField>
      </SCard>

      <SCard :title="t('settingsTab.alerts')">
        <div class="mod-form">
          <div class="mod-form-row">
            <SField :label="t('settingsTab.errorRateAlert')" :hint="t('settingsTab.errorRateAlertHint')" :error="errs.error_rate_alert_percent">
              <SInput v-model="form.error_rate_alert_percent" type="number" min="0" max="100" :placeholder="String(schemaDefault('error_rate_alert_percent'))" />
            </SField>
            <SField :label="t('settingsTab.statsRetention')" :hint="t('settingsTab.statsRetentionHint')" :error="errs.stats_retention_days">
              <SInput v-model="form.stats_retention_days" type="number" min="7" max="3650" :placeholder="String(schemaDefault('stats_retention_days'))" />
            </SField>
          </div>
          <SField :label="t('settingsTab.webhookUrl')" :hint="kept.notify_webhook_url ? t('settingsTab.secretKept') : t('settingsTab.webhookUrlHint')" :error="errs.notify_webhook_url">
            <SInput v-model="form.notify_webhook_url" :maxlength="1000" placeholder="https://" />
          </SField>
          <SField :label="t('settingsTab.webhookSecret')" :hint="kept.notify_webhook_secret ? t('settingsTab.secretKept') : t('settingsTab.webhookSecretHint')" :error="errs.notify_webhook_secret">
            <SInput v-model="form.notify_webhook_secret" type="password" :maxlength="200" autocomplete="new-password" />
          </SField>
          <div v-if="kept.notify_webhook_url || kept.notify_webhook_secret" class="mod-toolbar">
            <SButton v-if="kept.notify_webhook_url" size="sm" variant="ghost" @click="kept.notify_webhook_url = false">{{ t('settingsTab.clearUrl') }}</SButton>
            <SButton v-if="kept.notify_webhook_secret" size="sm" variant="ghost" @click="kept.notify_webhook_secret = false">{{ t('settingsTab.clearSecret') }}</SButton>
          </div>
        </div>
      </SCard>

      <SCard :title="t('settingsTab.jev')" :subtitle="t('settingsTab.jevHint')">
        <div class="mod-form">
          <SSegmented v-model="jevMode" :options="jevOptions" size="sm" />
          <SAlert v-if="errs.jev_default_set" tone="danger" dense>{{ errs.jev_default_set }}</SAlert>
          <JevQuestionsEditor v-if="jev" v-model="jev">
            <template #toolbar>
              <SButton size="sm" @click="jevMode = 'custom'">{{ t('settingsTab.jevCopyBuiltin') }}</SButton>
            </template>
          </JevQuestionsEditor>
        </div>
      </SCard>

      <div class="mod-toolbar">
        <SButton type="submit" variant="primary" :loading="saving">{{ t('save') }}</SButton>
      </div>
    </form>
  </div>
</template>
