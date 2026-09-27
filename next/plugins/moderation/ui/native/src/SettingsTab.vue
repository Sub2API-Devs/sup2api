<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { isApiError } from '@sub2api/host'
import { SButton, SCard, SField, SIcon, SInput, SSelect, STextarea } from '@sub2api/ui'
import {
  canManageSettings,
  errorMessage,
  fetchLLMSettings,
  saveLLMSettings,
  SETTINGS_MASK,
  useModHost,
  type LLMSettings
} from './host'

// LLM configuration tab: base_url, api_key, model, system_prompt, categories,
// and the agent-loop knobs (tool_choice, max_turns, temperature, max_tokens, timeout_ms).
// Reads and writes /api/v1/plugins/moderation/settings via host.api.
const host = useModHost()
const t = host.t

const canEdit = canManageSettings()
// Literal placeholder shown in the prompt help; passed as a param because
// vue-i18n rejects nested braces in messages.
const PROMPT_TOKEN = '{{categories}}'

// ------------------------------------------------------------------ state

const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const saveError = ref('')
const saved = ref(false)

const form = reactive<LLMSettings>({
  base_url: '',
  api_key: '',
  model: '',
  system_prompt: '',
  categories: [],
  tool_choice: 'required',
  max_turns: 3,
  temperature: 0,
  max_tokens: 512,
  timeout_ms: 10000
})

// Track whether api_key was masked on load (existing secret stored server-side).
const apiKeyMasked = ref(false)

const toolChoiceOptions = computed(() => [
  { value: 'required', label: t('llm.toolChoiceRequired') },
  { value: 'function', label: t('llm.toolChoiceFunction') },
  { value: 'auto', label: t('llm.toolChoiceAuto') }
])

function applyLoaded(s: LLMSettings) {
  Object.assign(form, s)
  apiKeyMasked.value = s.api_key === SETTINGS_MASK
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    applyLoaded(await fetchLLMSettings())
  } catch (e) {
    loadError.value = errorMessage(e, t('llm.loadFailed'))
  } finally {
    loading.value = false
  }
}

onMounted(load)

// ------------------------------------------------------------------ categories

function addCategory() {
  form.categories = [...form.categories, { id: '', description: '' }]
}

function removeCategory(i: number) {
  form.categories = form.categories.filter((_, j) => j !== i)
}

// ------------------------------------------------------------------ save

async function save() {
  saving.value = true
  saveError.value = ''
  saved.value = false
  try {
    await saveLLMSettings({ ...form })
    saved.value = true
    // Re-load to pick up any server-side normalisation (e.g. masking).
    applyLoaded(await fetchLLMSettings())
    setTimeout(() => { saved.value = false }, 3000)
  } catch (e) {
    if (isApiError(e) && e.fields && Object.keys(e.fields).length) {
      const msgs = Object.entries(e.fields).map(([k, v]) => `${k}: ${v}`).join('; ')
      saveError.value = msgs
    } else {
      saveError.value = errorMessage(e, t('llm.saveFailed'))
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mod-settings">
    <p v-if="loadError" class="mod-alert mod-alert-danger">{{ loadError }}</p>

    <template v-else-if="!loading">
      <!-- Connection -->
      <SCard :title="t('llm.connection')" class="mod-section">
        <div class="mod-form">
          <SField :label="t('llm.baseUrl')" :hint="t('llm.baseUrlHelp')">
            <SInput v-model="form.base_url" type="url" :placeholder="t('llm.baseUrlPlaceholder')" :disabled="!canEdit" />
          </SField>

          <SField :label="t('llm.apiKey')" :hint="t('llm.apiKeyHelp')">
            <SInput
              v-model="form.api_key"
              type="password"
              :placeholder="apiKeyMasked ? t('llm.apiKeySet') : t('llm.apiKeyPlaceholder')"
              :disabled="!canEdit"
              autocomplete="new-password"
            />
          </SField>

          <SField :label="t('llm.model')" :hint="t('llm.modelHelp')">
            <SInput v-model="form.model" placeholder="gpt-4o-mini" :disabled="!canEdit" />
          </SField>
        </div>
      </SCard>

      <!-- Prompt -->
      <SCard :title="t('llm.prompt')" class="mod-section">
        <div class="mod-form">
          <SField :label="t('llm.systemPrompt')" :hint="t('llm.systemPromptHelp', { token: PROMPT_TOKEN })">
            <STextarea
              v-model="form.system_prompt"
              class="mod-textarea"
              :rows="10"
              :placeholder="t('llm.systemPromptPlaceholder', { token: PROMPT_TOKEN })"
              :disabled="!canEdit"
            />
          </SField>

          <SField :label="t('llm.categories')" :hint="t('llm.categoriesHelp')">
            <div v-if="form.categories.length" class="mod-cat-list">
              <div v-for="(cat, i) in form.categories" :key="i" class="mod-cat-row">
                <SInput v-model="cat.id" class="mod-cat-id" :placeholder="t('llm.catIdPlaceholder')" :disabled="!canEdit" />
                <SInput v-model="cat.description" class="mod-cat-desc" :placeholder="t('llm.catDescPlaceholder')" :disabled="!canEdit" />
                <SButton v-if="canEdit" variant="ghost" size="sm" class="mod-cat-del" @click="removeCategory(i)">
                  <SIcon name="close" class="mod-icon" />
                </SButton>
              </div>
            </div>
            <p v-else class="muted mod-small">{{ t('llm.categoriesEmpty') }}</p>
            <SButton v-if="canEdit" variant="ghost" size="sm" class="mod-mt-xs" @click="addCategory">
              <SIcon name="plus" class="mod-icon" />{{ t('llm.addCategory') }}
            </SButton>
          </SField>
        </div>
      </SCard>

      <!-- Agent loop knobs -->
      <SCard :title="t('llm.agentLoop')" class="mod-section">
        <div class="mod-form mod-form-grid">
          <SField :label="t('llm.toolChoice')">
            <SSelect v-model="form.tool_choice" :options="toolChoiceOptions" :disabled="!canEdit" />
          </SField>

          <SField :label="t('llm.maxTurns')">
            <SInput v-model="form.max_turns" type="number" min="1" max="5" :disabled="!canEdit" />
          </SField>

          <SField :label="t('llm.temperature')">
            <SInput v-model="form.temperature" type="number" min="0" max="2" step="0.1" :disabled="!canEdit" />
          </SField>

          <SField :label="t('llm.maxTokens')">
            <SInput v-model="form.max_tokens" type="number" min="64" max="4096" :disabled="!canEdit" />
          </SField>

          <SField :label="t('llm.timeoutMs')">
            <SInput v-model="form.timeout_ms" type="number" min="1000" max="25000" step="500" :disabled="!canEdit" />
          </SField>
        </div>
      </SCard>

      <!-- Save bar -->
      <div v-if="canEdit" class="mod-settings-footer">
        <p v-if="saveError" class="mod-alert mod-alert-danger mod-mb-0">{{ saveError }}</p>
        <p v-if="saved" class="mod-alert mod-alert-success mod-mb-0">{{ t('llm.saved') }}</p>
        <SButton variant="primary" :loading="saving" @click="save">
          <SIcon v-if="!saving" name="check" class="mod-icon" />{{ t('llm.save') }}
        </SButton>
      </div>
    </template>
  </div>
</template>
