<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SProgress } from '@sub2api/ui'
import type { ApiKey } from '@/api/types'
import { formatCompact } from '@/utils/format'
import { limitRows, usageTone } from './keyLimits'

// RPM, TPM and concurrency of a key, each as current use / cap (∞ when
// unlimited), with a bar under the capped ones.
const props = defineProps<{ apiKey: ApiKey }>()
const { t } = useI18n()
const rows = computed(() => limitRows(props.apiKey))
</script>

<template>
  <div class="min-w-32 space-y-1" data-testid="key-limits">
    <div v-for="r in rows" :key="r.field" class="text-xs tabular-nums" :data-limit="r.field">
      <div class="flex items-baseline justify-between gap-2">
        <span class="text-fg-muted">{{ t(r.short) }}</span>
        <span :class="r.max ? 'text-fg' : 'text-fg-muted'">{{ r.used === undefined ? '—' : formatCompact(r.used) }} / {{ r.max ? formatCompact(r.max) : '∞' }}</span>
      </div>
      <SProgress v-if="r.max && r.used !== undefined" :value="r.used" :max="r.max" :tone="usageTone(r.used, r.max)" class="mt-0.5" />
    </div>
  </div>
</template>
