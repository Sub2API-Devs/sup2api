<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SChip, SProgress } from '@sub2api/ui'
import type { ApiKey } from '@/api/types'
import { formatCompact } from '@/utils/format'
import { cappedRows, usageTone } from './keyLimits'

// The limits a key caps (RPM, TPM, concurrency) as current use / cap over a
// bar; an "unlimited" chip when it caps none.
const props = defineProps<{ apiKey: ApiKey }>()
const { t } = useI18n()
const rows = computed(() => cappedRows(props.apiKey))
</script>

<template>
  <div data-testid="key-limits">
    <SChip v-if="!rows.length" size="xs">{{ t('apikeys.unlimited') }}</SChip>
    <div v-else class="min-w-28 space-y-1">
      <div v-for="r in rows" :key="r.field" class="text-xs tabular-nums" :data-limit="r.field">
        <div class="flex items-baseline justify-between gap-2">
          <span class="text-fg-muted">{{ t(r.short) }}</span>
          <span>{{ r.used === undefined ? '—' : formatCompact(r.used) }} / {{ formatCompact(r.max) }}</span>
        </div>
        <SProgress v-if="r.used !== undefined" :value="r.used" :max="r.max" :tone="usageTone(r.used, r.max)" class="mt-0.5" />
      </div>
    </div>
  </div>
</template>
