<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { isApiError } from '@sub2api/host'
import { SButton, SCard, SIcon } from '@sub2api/ui'
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
          <label class="mod-label">
            <span>{{ t('llm.baseUrl') }}</span>
            <input
              v-model="form.base_url"
              type="url"
              class="input"
              :placeholder="t('llm.baseUrlPlaceholder')"
              :disabled="!canEdit"
            />
            <span class="muted mod-small">{{ t('llm.baseUrlHelp') }}</span>
          </label>

          <label class="mod-label">
            <span>{{ t('llm.apiKey') }}</span>
            <input
              v-model="form.api_key"
              type="password"
              class="input"
              :placeholder="apiKeyMasked ? t('llm.apiKeySet') : t('llm.apiKeyPlaceholder')"
              :disabled="!canEdit"
              autocomplete="new-password"
            />
            <span class="muted mod-small">{{ t('llm.apiKeyHelp') }}</span>
          </label>

          <label class="mod-label">
            <span>{{ t('llm.model') }}</span>
            <input
              v-model="form.model"
              type="text"
              class="input"
              placeholder="gpt-4o-mini"
              :disabled="!canEdit"
            />
            <span class="muted mod-small">{{ t('llm.modelHelp') }}</span>
          </label>
        </div>
      </SCard>

      <!-- Prompt -->
      <SCard :title="t('llm.prompt')" class="mod-section">
        <div class="mod-form">
          <label class="mod-label">
            <span>{{ t('llm.systemPrompt') }}</span>
            <textarea
              v-model="form.system_prompt"
              class="input mod-textarea"
              rows="10"
              :placeholder="t('llm.systemPromptPlaceholder')"
              :disabled="!canEdit"
            />
            <span class="muted mod-small">{{ t('llm.systemPromptHelp') }}</span>
          </label>

          <div class="mod-label">
            <span>{{ t('llm.categories') }}</span>
            <div v-if="form.categories.length" class="mod-cat-list">
              <div v-for="(cat, i) in form.categories" :key="i" class="mod-cat-row">
                <input
                  v-model="cat.id"
                  type="text"
                  class="input mod-cat-id"
                  :placeholder="t('llm.catIdPlaceholder')"
                  :disabled="!canEdit"
                />
                <input
                  v-model="cat.description"
                  type="text"
                  class="input mod-cat-desc"
                  :placeholder="t('llm.catDescPlaceholder')"
                  :disabled="!canEdit"
                />
                <button v-if="canEdit" type="button" class="btn btn-ghost btn-sm mod-cat-del" @click="removeCategory(i)">
                  <SIcon name="close" class="mod-icon" />
                </button>
              </div>
            </div>
            <p v-else class="muted mod-small">{{ t('llm.categoriesEmpty') }}</p>
            <button v-if="canEdit" type="button" class="btn btn-ghost btn-sm mod-mt-xs" @click="addCategory">
              <SIcon name="plus" class="mod-icon" />{{ t('llm.addCategory') }}
            </button>
            <span class="muted mod-small">{{ t('llm.categoriesHelp') }}</span>
          </div>
        </div>
      </SCard>

      <!-- Agent loop knobs -->
      <SCard :title="t('llm.agentLoop')" class="mod-section">
        <div class="mod-form mod-form-grid">
          <label class="mod-label">
            <span>{{ t('llm.toolChoice') }}</span>
            <select v-model="form.tool_choice" class="input" :disabled="!canEdit">
              <option value="required">{{ t('llm.toolChoiceRequired') }}</option>
              <option value="function">{{ t('llm.toolChoiceFunction') }}</option>
              <option value="auto">{{ t('llm.toolChoiceAuto') }}</option>
            </select>
          </label>

          <label class="mod-label">
            <span>{{ t('llm.maxTurns') }}</span>
            <input v-model.number="form.max_turns" type="number" class="input" min="1" max="5" :disabled="!canEdit" />
          </label>

          <label class="mod-label">
            <span>{{ t('llm.temperature') }}</span>
            <input v-model.number="form.temperature" type="number" class="input" min="0" max="2" step="0.1" :disabled="!canEdit" />
          </label>

          <label class="mod-label">
            <span>{{ t('llm.maxTokens') }}</span>
            <input v-model.number="form.max_tokens" type="number" class="input" min="64" max="4096" :disabled="!canEdit" />
          </label>

          <label class="mod-label">
            <span>{{ t('llm.timeoutMs') }}</span>
            <input v-model.number="form.timeout_ms" type="number" class="input" min="1000" max="25000" step="500" :disabled="!canEdit" />
          </label>
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
