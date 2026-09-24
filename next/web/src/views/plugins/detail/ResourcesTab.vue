<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SButton, SCard, toast } from '@sub2api/ui'
import { fieldErrors, notifyError } from '@/utils/errors'
import { useAuthStore } from '@/stores/auth'
import { pick, type PluginDetail, type PluginResources } from '../pluginUtil'

const props = defineProps<{ detail: PluginDetail }>()
const emit = defineEmits<{ (e: 'changed'): void }>()
const { t } = useI18n()
const auth = useAuthStore()
const canManage = computed(() => auth.has('plugin:manage'))

type Field = 'memory_mb' | 'cpu' | 'max_threads' | 'max_open_files'

const fields: Array<{ key: Field; label: string; step: string; manifest: string[]; unit?: string }> = [
  { key: 'memory_mb', label: 'plugins.resources.memoryMB', step: '1', manifest: ['memoryMB', 'memory_mb'], unit: 'MB' },
  { key: 'cpu', label: 'plugins.resources.cpu', step: '0.05', manifest: ['cpu'] },
  { key: 'max_threads', label: 'plugins.resources.threads', step: '1', manifest: ['maxProcs', 'max_threads', 'maxThreads'] },
  { key: 'max_open_files', label: 'plugins.resources.files', step: '1', manifest: ['maxOpenFiles', 'max_open_files'] }
]

const form = reactive<Record<Field, string>>({ memory_mb: '', cpu: '', max_threads: '', max_open_files: '' })
const errors = ref<Record<string, string>>({})
const saving = ref(false)

const requested = computed(() => pick<Record<string, any>>(props.detail.manifest, 'resources') || {})

function reset() {
  const r: PluginResources = props.detail.resources || {}
  for (const f of fields) {
    const v = r[f.key] ?? pick(requested.value, ...f.manifest)
    form[f.key] = v === undefined || v === null ? '' : String(v)
  }
  errors.value = {}
}
watch(() => props.detail.resources, reset, { immediate: true })

function requestedOf(f: (typeof fields)[number]): string {
  const v = pick(requested.value, ...f.manifest)
  return v === undefined ? '—' : `${v}${f.unit ? ' ' + f.unit : ''}`
}

function differs(f: (typeof fields)[number]): boolean {
  const v = pick(requested.value, ...f.manifest)
  return v !== undefined && form[f.key] !== '' && Number(form[f.key]) !== Number(v)
}

async function save() {
  const body: Record<string, number | null> = {}
  for (const f of fields) {
    const s = form[f.key].trim()
    if (s === '') body[f.key] = null
    else {
      const n = Number(s)
      if (!Number.isFinite(n) || n < 0) {
        errors.value = { [f.key]: t('plugins.resources.invalid') }
        return
      }
      body[f.key] = f.key === 'cpu' ? n : Math.round(n)
    }
  }
  saving.value = true
  errors.value = {}
  try {
    await api.put(`/plugins/${encodeURIComponent(props.detail.key)}/resources`, body)
    toast(t('plugins.resources.saved'), 'success')
    emit('changed')
  } catch (e) {
    errors.value = fieldErrors(e)
    notifyError(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <SCard :title="t('plugins.detail.tabs.resources')" :subtitle="t('plugins.resources.hint')">
    <table class="w-full max-w-2xl text-sm">
      <thead>
        <tr class="text-left text-xs muted">
          <th class="py-2 font-medium">{{ t('plugins.resources.item') }}</th>
          <th class="py-2 font-medium">{{ t('plugins.resources.requested') }}</th>
          <th class="py-2 font-medium">{{ t('plugins.resources.effective') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="f in fields" :key="f.key" class="align-top">
          <td class="py-2 pr-4">{{ t(f.label) }}</td>
          <td class="py-2 pr-4 font-mono">{{ requestedOf(f) }}</td>
          <td class="py-2">
            <div class="flex items-center gap-2">
              <input v-model="form[f.key]" type="number" min="0" :step="f.step" class="input w-40" :disabled="!canManage" />
              <span v-if="f.unit" class="text-xs muted">{{ f.unit }}</span>
              <span v-if="differs(f)" class="text-xs text-primary-600 dark:text-primary-400">{{ t('plugins.resources.overridden') }}</span>
            </div>
            <p v-if="errors[f.key]" class="input-error-text">{{ errors[f.key] }}</p>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="canManage" class="mt-4 flex flex-wrap items-center gap-2">
      <SButton variant="primary" :loading="saving" @click="save">{{ t('common.save') }}</SButton>
      <SButton :disabled="saving" @click="reset">{{ t('common.reset') }}</SButton>
      <span class="text-xs muted">{{ t('plugins.resources.restartHint') }}</span>
    </div>
  </SCard>
</template>
