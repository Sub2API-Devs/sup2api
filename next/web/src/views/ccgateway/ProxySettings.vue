<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@sub2api/host'
import { SInput } from '@sub2api/ui'


interface Config { mode: 'inherit' | 'direct' | 'proxy'; configured: boolean; url_redacted: string; revision: number }
const props = defineProps<{ disabled?: boolean; targetRevision?: number }>()
const emit = defineEmits<{ (event: 'busy', value: boolean): void }>()
const { t } = useI18n()
const base = '/system/ccgateway/proxy'
const saved = ref<Config | null>(null), mode = ref<Config['mode']>('inherit'), url = ref(''), show = ref(false), busy = ref(false), error = ref(''), notice = ref('')
const disabled = computed(() => busy.value || props.disabled)
const keepExisting = computed(() => saved.value?.mode === 'proxy' && saved.value.configured)
const dirty = computed(() => !!saved.value && (mode.value !== saved.value.mode || !!url.value.trim()))
const redacted = computed(() => {
  try { const value = new URL(saved.value?.url_redacted || ''); if (!['http:', 'https:'].includes(value.protocol)) return ''; return value.origin } catch { return '' }
})
watch(busy, value => emit('busy', value))
watch(mode, () => { url.value = ''; show.value = false; notice.value = ''; error.value = '' }, { flush: 'sync' })
function assign(data: Config) { saved.value = data; mode.value = data.mode; url.value = ''; show.value = false }
async function run(action: () => Promise<void>) {
  if (busy.value) return
  busy.value = true; error.value = ''; notice.value = ''
  try { await action() } catch (e) { if ((e as { code?: string }).code !== 'step_up_cancelled') error.value = t('ccgateway.proxy.failed') } finally { busy.value = false }
}
async function load() { saved.value = null; url.value = ''; show.value = false; assign(await api.get<Config>(base)) }
async function save() {
  if (disabled.value || !dirty.value) return
  const payload: { mode: Config['mode']; url?: string } = { mode: mode.value }
  if (mode.value === 'proxy') {
    const value = url.value.trim()
    if (!value && !keepExisting.value) { error.value = t('ccgateway.proxy.required'); return }
    if (value) {
      try { const parsed = new URL(value); if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) throw Error() } catch { error.value = t('ccgateway.proxy.invalid'); return }
      payload.url = value
    }
  }
  await run(async () => { assign(await api.put<Config>(base, payload, { signal: AbortSignal.timeout(55000) })); notice.value = t('ccgateway.proxy.saved') })
}
watch(() => props.targetRevision, () => run(load))
onMounted(() => run(load))
onBeforeUnmount(() => { url.value = '' })
</script>
<template>
  <section class="card space-y-4 border border-gray-200 p-5 dark:border-dark-700" :aria-label="t('ccgateway.proxy.title')">
    <div><h3 class="font-semibold">{{ t('ccgateway.proxy.title') }}</h3><p class="mt-1 text-sm text-gray-500">{{ t('ccgateway.proxy.description') }}</p></div>
    <p class="rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-950/30 dark:text-blue-300">{{ t('ccgateway.proxy.effect') }}</p>
    <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p><p v-if="notice" role="status" class="text-sm text-emerald-600">{{ notice }}</p>
    <button v-if="!saved" class="btn btn-secondary btn-sm" :disabled="disabled" @click="run(load)">{{ t('ccgateway.proxy.reload') }}</button>
    <form v-else class="space-y-4" @submit.prevent="save">
      <fieldset :disabled="disabled" class="space-y-4">
        <label class="block text-sm">{{ t('ccgateway.proxy.mode') }}<select v-model="mode" class="input mt-1 w-full" data-testid="proxy-mode"><option value="inherit">{{ t('ccgateway.proxy.inherit') }}</option><option value="direct">{{ t('ccgateway.proxy.direct') }}</option><option value="proxy">{{ t('ccgateway.proxy.proxy') }}</option></select></label>
        <template v-if="mode === 'proxy'">
          <label class="block text-sm" for="ccgateway-proxy-url">{{ t('ccgateway.proxy.url') }}</label>
          <div class="flex gap-2"><SInput id="ccgateway-proxy-url" v-model="url" :type="show ? 'text' : 'password'" autocomplete="new-password" :required="!keepExisting" :placeholder="keepExisting ? t('ccgateway.proxy.keep') : 'http://proxy.example:8080'" /><button type="button" class="btn btn-secondary" :aria-pressed="show" @click="show = !show">{{ t(show ? 'ccgateway.proxy.hide' : 'ccgateway.proxy.show') }}</button></div>
          <p class="text-xs text-gray-500">{{ t('ccgateway.proxy.support') }}</p>
          <p v-if="redacted" class="break-all text-sm text-gray-500">{{ t('ccgateway.proxy.current') }} <code>{{ redacted }}</code></p>
        </template>
        <p v-else class="text-xs text-gray-500">{{ t('ccgateway.proxy.clear') }}</p>
        <div class="flex items-center justify-between gap-3"><span class="text-xs text-gray-500">{{ t('ccgateway.proxy.revision', { revision: saved.revision }) }}</span><button class="btn btn-primary" :disabled="!dirty" data-testid="proxy-save">{{ t('ccgateway.proxy.save') }}</button></div>
      </fieldset>
    </form>
  </section>

</template>
