<script setup lang="ts">
// One body of a request log detail (REQUEST-LOG-ASYNC-DESIGN.md §5): the
// file viewer, or why the body is not shown.
import { useI18n } from 'vue-i18n'
import { SHint } from '@sub2api/ui'
import RequestLogFileView from './RequestLogFileView.vue'
import type { BodyPart, BodySource } from './requestLogViewer'

defineProps<{ accountId: number; log: string; requestId: string; part: BodyPart; source: BodySource }>()
const { t } = useI18n()
</script>

<template>
  <div class="space-y-2" :data-testid="`request-log-body-${part}`">
    <SHint v-if="'reason' in source" size="xs" :data-testid="`request-log-body-reason-${part}`">
      {{ source.reason === 'missing' ? t(`ccgateway.logViewer.body.missing.${part}`) : t(`ccgateway.logViewer.body.${source.reason === 'needs_manage' ? 'needsManage' : source.reason}`) }}
    </SHint>
    <template v-else>
      <SHint v-if="source.raw" size="xs" data-testid="request-log-body-raw">{{ t('ccgateway.logViewer.body.raw') }}</SHint>
      <RequestLogFileView :key="source.file.name" :account-id="accountId" :log="log" :request-id="requestId" :name="source.file.name" :initial-raw="source.raw" />
    </template>
  </div>
</template>
