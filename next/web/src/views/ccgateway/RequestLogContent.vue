<script setup lang="ts">
// All content files of one request log (full level, settings:manage): a file
// list by kind and the viewer of the chosen one (RequestLogFileView).
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import RequestLogFileView from './RequestLogFileView.vue'
import { FILE_KINDS, sizeText, type RequestLogFile } from './requestLogViewer'

const props = defineProps<{ accountId: number; log: string; requestId: string; files: RequestLogFile[] }>()
const { t } = useI18n()

const selected = ref(props.files[0]?.name ?? '')
const groups = computed(() => FILE_KINDS.map(kind => ({ kind, files: props.files.filter(f => (FILE_KINDS as readonly string[]).includes(f.kind) ? f.kind === kind : kind === 'other') })).filter(g => g.files.length))
</script>

<template>
  <div class="grid min-h-0 grid-cols-1 gap-4 md:grid-cols-[14rem_minmax(0,1fr)]" data-testid="request-log-content">
    <nav class="space-y-3" :aria-label="t('ccgateway.logViewer.content.files')">
      <div v-for="g in groups" :key="g.kind">
        <div class="mb-1 text-xxs font-medium uppercase tracking-wide text-fg-subtle">{{ t(`ccgateway.logViewer.kind.${g.kind}`) }}</div>
        <button
          v-for="f in g.files" :key="f.name" type="button"
          class="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-surface-2"
          :class="f.name === selected ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'text-fg'"
          :aria-current="f.name === selected ? 'true' : undefined"
          :data-testid="`request-log-file-${f.name}`"
          @click="selected = f.name"
        >
          <span class="min-w-0 truncate font-mono">{{ f.name }}</span>
          <span class="shrink-0 text-fg-subtle">{{ sizeText(f.bytes) }}</span>
        </button>
      </div>
    </nav>
    <RequestLogFileView v-if="selected" :key="selected" :account-id="accountId" :log="log" :request-id="requestId" :name="selected" />
  </div>
</template>
