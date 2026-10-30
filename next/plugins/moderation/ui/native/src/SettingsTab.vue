<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { isApiError } from '@sub2api/host'
import { SAlert, SButton, SCard, SCode, SField, SHint, SInput, SLink, SSegmented, SSelect, SSpinner } from '@sub2api/ui'
import JevQuestionsEditor from './JevQuestionsEditor.vue'
import { BLOCK_FORMATS, blockResponse, type BlockFormat } from './blockPreview'
import { useCatalog } from './catalog'
import {
  SETTINGS_MASK,
  errorMessage,
  fetchDefaults,
  fetchPluginSettings,
  jevPayload,
  savePluginSettings,
  settingsPath,
  useModHost,
  type Defaults,
  type JevQuestions
} from './host'

// The moderation settings of the console (new-api settings page): the block
// response with a preview per API format, the AI analysis channel, the
// error-rate alert, statistics retention, the notification webhook and the
// Jev default question set. The other settings stay on the plugin's schema
// form; a save writes all stored values back with these keys changed.
const host = useModHost()
const t = host.t
const catalog = useCatalog()

/** Defaults of forms/settings.schema.json for keys never stored. */
const DEFAULTS = {
  block_status: 403,
  block_message: '提示词审核未通过，请调整输入后重试',
  analysis_channel_id: 0,
  error_rate_alert_percent: 5,
  stats_retention_days: 90,
  notify_webhook_url: '',
  notify_webhook_secret: ''
}
type Key = keyof typeof DEFAULTS
const KEYS = Object.keys(DEFAULTS) as Key[]

const stored = ref<Record<string, unknown>>({})
const form = reactive({ ...DEFAULTS })
/** secret keys with a stored value, kept while their input stays empty */
const kept = reactive<Partial<Record<Key, boolean>>>({})
const jev = ref<JevQuestions | null>(null)
const defaults = ref<Defaults | null>(null)
const errs = reactive<Record<string, string>>({})
const loading = ref(false)
const saving = ref(false)
const error = ref('')

const copyQuestions = (q: JevQuestions): JevQuestions => ({ preamble: q.preamble || '', items: q.items.map((x) => ({ ...x })) })

async function reload() {
  loading.value = true
  error.value = ''
  try {
    const [s, d] = await Promise.all([fetchPluginSettings(), fetchDefaults()])
    stored.value = s.values || {}
    defaults.value = d
    for (const k of KEYS) kept[k] = stored.value[k] === SETTINGS_MASK
    Object.assign(form, Object.fromEntries(KEYS.map((k) => [k, kept[k] ? '' : (stored.value[k] ?? DEFAULTS[k])])))
    const set = stored.value.jev_default_set as JevQuestions | null | undefined
    jev.value = set ? copyQuestions(set) : null
  } catch (e) {
    error.value = errorMessage(e, t('settingsTab.loadFailed'))
  } finally {
    loading.value = false
  }
}
onMounted(reload)
defineExpose({ reload })

/** A secret as sent: the new value, the mask to keep the stored one, or '' to clear it. */
const secretValue = (k: Key) => (form[k] !== '' ? form[k] : kept[k] ? SETTINGS_MASK : '')

async function save() {
  for (const k of Object.keys(errs)) delete errs[k]
  saving.value = true
  try {
    await savePluginSettings({
      ...stored.value,
      block_status: Number(form.block_status),
      block_message: form.block_message,
      analysis_channel_id: Number(form.analysis_channel_id),
      error_rate_alert_percent: Number(form.error_rate_alert_percent),
      stats_retention_days: Number(form.stats_retention_days),
      notify_webhook_url: secretValue('notify_webhook_url'),
      notify_webhook_secret: secretValue('notify_webhook_secret'),
      jev_default_set: jev.value && jevPayload(jev.value)
    })
    host.toast(t('saved'), 'success')
    await reload()
  } catch (e) {
    // Field errors name "values.<key>[.<path>]"; the first one of a key is shown.
    for (const [path, msg] of Object.entries(isApiError(e) ? e.fields : {})) errs[path.replace(/^values\./, '').split(/[.[]/)[0]] ||= msg
    if (!Object.keys(errs).length) host.toast(errorMessage(e, t('actionFailed')), 'error')
  } finally {
    saving.value = false
  }
}

const format = ref<BlockFormat>('openai')
const formatOptions = computed(() => BLOCK_FORMATS.map((f) => ({ value: f, label: t(`settingsTab.format.${f}`) })))
const preview = computed(() => blockResponse(format.value, Number(form.block_status), form.block_message))

const channelOptions = computed(() => [
  { value: 0, label: t('settingsTab.noAnalysis') },
  ...catalog.state.channels.filter((c) => c.type === 'llm').map((c) => ({ value: c.id, label: c.enabled ? c.name : `${c.name} (${t('disabled')})` }))
])

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
    <form v-else class="mod-form" @submit.prevent="save">
      <SCard :title="t('settingsTab.block')" :subtitle="t('settingsTab.blockHint')">
        <div class="mod-form">
          <div class="mod-form-row">
            <SField :label="t('settingsTab.blockStatus')" :error="errs.block_status">
              <SInput v-model="form.block_status" type="number" min="400" max="599" />
            </SField>
            <SField :label="t('settingsTab.blockMessage')" :error="errs.block_message">
              <SInput v-model="form.block_message" :maxlength="500" />
            </SField>
          </div>
          <SSegmented v-model="format" :options="formatOptions" size="sm" />
          <SCode :text="`HTTP ${preview.status}\n${preview.body}`" class="mod-text-block" />
          <SHint size="xs">{{ t('settingsTab.streamNote') }}</SHint>
        </div>
      </SCard>

      <SCard :title="t('settingsTab.analysis')">
        <SField :label="t('settingsTab.analysisChannel')" :hint="t('settingsTab.analysisChannelHint')" :error="errs.analysis_channel_id">
          <SSelect v-model="form.analysis_channel_id" :options="channelOptions" />
        </SField>
      </SCard>

      <SCard :title="t('settingsTab.alerts')">
        <div class="mod-form">
          <div class="mod-form-row">
            <SField :label="t('settingsTab.errorRateAlert')" :hint="t('settingsTab.errorRateAlertHint')" :error="errs.error_rate_alert_percent">
              <SInput v-model="form.error_rate_alert_percent" type="number" min="0" max="100" />
            </SField>
            <SField :label="t('settingsTab.statsRetention')" :hint="t('settingsTab.statsRetentionHint')" :error="errs.stats_retention_days">
              <SInput v-model="form.stats_retention_days" type="number" min="7" max="3650" />
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
