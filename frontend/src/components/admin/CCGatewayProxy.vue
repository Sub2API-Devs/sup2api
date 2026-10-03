<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiClient } from '@/api/client'
import Input from '@/components/common/Input.vue'
import TotpStepUpDialog from '@/components/auth/TotpStepUpDialog.vue'
import { isStepUpCancelled, useStepUp } from '@/composables/useStepUp'
interface Config { mode: 'inherit' | 'direct' | 'proxy'; configured: boolean; url_redacted: string; revision: number }
const props = defineProps<{ disabled?: boolean; targetRevision?: number }>()
const emit = defineEmits<{ (event: 'busy', value: boolean): void }>()
const { t } = useI18n(), stepUp = useStepUp()
const base = '/admin/plugins/builtin/ccgateway/proxy'
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
  try { await action() } catch (e) { if (!isStepUpCancelled(e)) error.value = t('admin.plugins.ccProxy.failed') } finally { busy.value = false }
}
async function load() { saved.value = null; url.value = ''; show.value = false; assign((await apiClient.get<Config>(base)).data) }
async function save() {
  if (disabled.value || !dirty.value) return
  const payload: { mode: Config['mode']; url?: string } = { mode: mode.value }
  if (mode.value === 'proxy') {
    const value = url.value.trim()
    if (!value && !keepExisting.value) { error.value = t('admin.plugins.ccProxy.required'); return }
    if (value) {
      try { const parsed = new URL(value); if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) throw Error() } catch { error.value = t('admin.plugins.ccProxy.invalid'); return }
      payload.url = value
    }
  }
  await run(async () => { assign((await stepUp.run(() => apiClient.put<Config>(base, payload, { timeout: 55000 }))).data); notice.value = t('admin.plugins.ccProxy.saved') })
}
watch(() => props.targetRevision, () => run(load))
onMounted(() => run(load))
onBeforeUnmount(() => { url.value = '' })
</script>
<template>
  <section class="card space-y-4 border border-gray-200 p-5 dark:border-dark-700" :aria-label="t('admin.plugins.ccProxy.title')">
    <div><h3 class="font-semibold">{{ t('admin.plugins.ccProxy.title') }}</h3><p class="mt-1 text-sm text-gray-500">{{ t('admin.plugins.ccProxy.description') }}</p></div>
    <p class="rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-950/30 dark:text-blue-300">{{ t('admin.plugins.ccProxy.effect') }}</p>
    <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p><p v-if="notice" role="status" class="text-sm text-emerald-600">{{ notice }}</p>
    <button v-if="!saved" class="btn btn-secondary btn-sm" :disabled="disabled" @click="run(load)">{{ t('admin.plugins.ccProxy.reload') }}</button>
    <form v-else class="space-y-4" @submit.prevent="save">
      <fieldset :disabled="disabled" class="space-y-4">
        <label class="block text-sm">{{ t('admin.plugins.ccProxy.mode') }}<select v-model="mode" class="input mt-1 w-full" data-testid="proxy-mode"><option value="inherit">{{ t('admin.plugins.ccProxy.inherit') }}</option><option value="direct">{{ t('admin.plugins.ccProxy.direct') }}</option><option value="proxy">{{ t('admin.plugins.ccProxy.proxy') }}</option></select></label>
        <template v-if="mode === 'proxy'">
          <Input id="ccgateway-proxy-url" v-model="url" :type="show ? 'text' : 'password'" autocomplete="new-password" :label="t('admin.plugins.ccProxy.url')" :required="!keepExisting" :placeholder="keepExisting ? t('admin.plugins.ccProxy.keep') : 'http://proxy.example:8080'" :hint="t('admin.plugins.ccProxy.support')">
            <template #suffix><button type="button" :aria-label="t(show ? 'admin.plugins.ccProxy.hide' : 'admin.plugins.ccProxy.show')" :aria-pressed="show" data-testid="proxy-show" @click="show = !show">{{ t(show ? 'admin.plugins.ccProxy.hide' : 'admin.plugins.ccProxy.show') }}</button></template>
          </Input>
          <p v-if="redacted" class="break-all text-sm text-gray-500">{{ t('admin.plugins.ccProxy.current') }} <code>{{ redacted }}</code></p>
        </template>
        <p v-else class="text-xs text-gray-500">{{ t('admin.plugins.ccProxy.clear') }}</p>
        <div class="flex items-center justify-between gap-3"><span class="text-xs text-gray-500">{{ t('admin.plugins.ccProxy.revision', { revision: saved.revision }) }}</span><button class="btn btn-primary" :disabled="!dirty" data-testid="proxy-save">{{ t('admin.plugins.ccProxy.save') }}</button></div>
      </fieldset>
    </form>
  </section>
  <TotpStepUpDialog :controller="stepUp" />
</template>
