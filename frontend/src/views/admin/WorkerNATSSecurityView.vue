<template>
  <AppLayout>
    <div class="mx-auto max-w-5xl space-y-8">
      <header class="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-6 dark:border-dark-700">
        <div>
          <button type="button" class="mb-3 inline-flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-primary-600 dark:text-dark-400" @click="router.push({ name: 'AdminWorkers' })">
            <Icon name="arrowLeft" size="sm" />
            {{ t('admin.workers.natsSecurity.back') }}
          </button>
          <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">{{ t('admin.workers.natsSecurity.title') }}</h1>
          <p class="mt-1 max-w-2xl text-sm text-gray-500 dark:text-dark-400">{{ t('admin.workers.natsSecurity.description') }}</p>
        </div>
        <div v-if="config" :class="['inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors', config.ready ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300']">
          <span :class="['h-2 w-2 rounded-full', config.ready ? 'bg-emerald-500' : 'bg-amber-500']"></span>
          {{ config.ready ? t('admin.workers.natsSecurity.ready') : t('admin.workers.natsSecurity.incomplete') }}
        </div>
      </header>

      <div v-if="loading" class="flex justify-center py-20"><LoadingSpinner /></div>

      <form v-else-if="config" class="space-y-8" @submit.prevent="save">
        <section aria-labelledby="nats-trust-heading">
          <div class="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 id="nats-trust-heading" class="text-base font-semibold text-gray-900 dark:text-white">{{ t('admin.workers.natsSecurity.trustTitle') }}</h2>
              <p class="mt-1 text-sm text-gray-500 dark:text-dark-400">{{ t('admin.workers.natsSecurity.trustHint') }}</p>
            </div>
            <span class="font-mono text-xs uppercase tracking-wider text-primary-600 dark:text-primary-300">NKey · JWT · nsc</span>
          </div>
          <dl class="divide-y divide-gray-100 border-y border-gray-200 dark:divide-dark-800 dark:border-dark-700">
            <div class="grid gap-1 py-4 md:grid-cols-[180px_1fr_auto] md:items-center">
              <dt class="text-sm font-medium text-gray-700 dark:text-gray-200">{{ t('admin.workers.natsSecurity.operator') }}</dt>
              <dd class="truncate font-mono text-xs text-gray-500 dark:text-dark-400" :title="config.operator_id">{{ config.operator_name || '—' }} · {{ config.operator_id || '—' }}</dd>
              <StatusMark :ok="config.issuer_configured" />
            </div>
            <div class="grid gap-1 py-4 md:grid-cols-[180px_1fr_auto] md:items-center">
              <dt class="text-sm font-medium text-gray-700 dark:text-gray-200">{{ t('admin.workers.natsSecurity.account') }}</dt>
              <dd class="truncate font-mono text-xs text-gray-500 dark:text-dark-400" :title="config.account_id">{{ config.account_name || '—' }} · {{ config.account_id || '—' }}</dd>
              <StatusMark :ok="config.issuer_configured" />
            </div>
            <div class="grid gap-1 py-4 md:grid-cols-[180px_1fr_auto] md:items-center">
              <dt class="text-sm font-medium text-gray-700 dark:text-gray-200">{{ t('admin.workers.natsSecurity.controlCredentials') }}</dt>
              <dd class="text-sm text-gray-500 dark:text-dark-400">{{ t('admin.workers.natsSecurity.controlCredentialsHint') }}</dd>
              <StatusMark :ok="config.control_credentials_configured" />
            </div>
          </dl>
        </section>

        <section aria-labelledby="nats-worker-heading" class="space-y-5">
          <div>
            <h2 id="nats-worker-heading" class="text-base font-semibold text-gray-900 dark:text-white">{{ t('admin.workers.natsSecurity.workerTitle') }}</h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-dark-400">{{ t('admin.workers.natsSecurity.workerHint') }}</p>
          </div>
          <div class="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px]">
            <div>
              <label class="input-label" for="worker-nats-url">{{ t('admin.workers.natsSecurity.workerUrl') }}</label>
              <input id="worker-nats-url" v-model.trim="draft.worker_url" class="input font-mono" placeholder="tls://nats.example.com:443" autocomplete="off" />
              <p class="mt-1.5 text-xs text-gray-500 dark:text-dark-400">{{ t('admin.workers.natsSecurity.workerUrlHint') }}</p>
            </div>
            <div>
              <label class="input-label" for="worker-nats-ttl">{{ t('admin.workers.natsSecurity.ttl') }}</label>
              <input id="worker-nats-ttl" v-model.number="draft.credential_ttl_days" type="number" min="0" max="3650" class="input" required />
              <p class="mt-1.5 text-xs text-gray-500 dark:text-dark-400">{{ t('admin.workers.natsSecurity.ttlHint') }}</p>
            </div>
          </div>
          <div class="grid gap-5 border-y border-gray-100 py-4 text-sm dark:border-dark-800 md:grid-cols-2">
            <div><span class="text-gray-500 dark:text-dark-400">{{ t('admin.workers.natsSecurity.subject') }}</span><code class="mt-1 block font-mono text-xs text-gray-800 dark:text-gray-200">{{ config.subject }}</code></div>
            <div><span class="text-gray-500 dark:text-dark-400">{{ t('admin.workers.natsSecurity.workerPermission') }}</span><code class="mt-1 block font-mono text-xs text-gray-800 dark:text-gray-200">publish {{ config.subject }} · subscribe _INBOX.&gt;</code></div>
          </div>
        </section>

        <footer class="flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 pt-6 dark:border-dark-700">
          <p class="max-w-2xl text-xs leading-5 text-gray-500 dark:text-dark-400">{{ t('admin.workers.natsSecurity.saveHint') }}</p>
          <button type="submit" class="btn btn-primary min-w-28" :disabled="saving">
            <Icon name="check" size="sm" class="mr-2" />
            {{ saving ? t('common.saving') : t('common.save') }}
          </button>
        </footer>
      </form>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { defineComponent, h, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { adminAPI, type WorkerNATSSecurityConfig } from '@/api/admin'
import AppLayout from '@/components/layout/AppLayout.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import Icon from '@/components/icons/Icon.vue'
import { useAppStore } from '@/stores/app'

const { t } = useI18n()
const router = useRouter()
const appStore = useAppStore()
const loading = ref(true)
const saving = ref(false)
const config = ref<WorkerNATSSecurityConfig | null>(null)
const draft = reactive({ worker_url: '', credential_ttl_days: 0 })

const StatusMark = defineComponent({
  props: { ok: { type: Boolean, required: true } },
  setup(props) {
    return () => h('span', { class: ['text-xs font-medium', props.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'] }, props.ok ? t('admin.workers.natsSecurity.configured') : t('admin.workers.natsSecurity.missing'))
  }
})

function apply(next: WorkerNATSSecurityConfig) {
  config.value = next
  draft.worker_url = next.worker_url
  draft.credential_ttl_days = next.credential_ttl_days
}

async function load() {
  loading.value = true
  try { apply(await adminAPI.workers.getNATSSecurity()) }
  catch (error) { appStore.showError(error instanceof Error ? error.message : t('admin.workers.natsSecurity.loadFailed')) }
  finally { loading.value = false }
}

async function save() {
  saving.value = true
  try {
    apply(await adminAPI.workers.updateNATSSecurity({ ...draft }))
    appStore.showSuccess(t('admin.workers.natsSecurity.saved'))
  } catch (error) {
    appStore.showError(error instanceof Error ? error.message : t('admin.workers.natsSecurity.saveFailed'))
  } finally { saving.value = false }
}

onMounted(load)
</script>
