<script setup lang="ts">
// account.list.quota slot (codex_device accounts): how many official usage
// resets the account has, beside its usage windows. The count is the
// plugin's cache (resetCount.ts), so the list's refreshes never reach
// OpenAI; nothing shows until one is known. A click opens the detail tab's
// content (CodexResetTab) in a dialog: every reset, its expiry, and "Use".
import { computed, ref, watch } from 'vue'
import { SChip, SModal } from '@sub2api/ui'
import CodexResetTab from './CodexResetTab.vue'
import { useCodexHost } from './host'
import { requestResetCount, resetCount } from './resetCount'
import type { QuotaLike } from './resetCredits'

const props = defineProps<{ account: { id: number; name?: string; quota?: QuotaLike | null } }>()
const t = useCodexHost().t
const open = ref(false)
const count = computed(() => resetCount(props.account.id))

// A list reload hands every row a new object: ask again then.
watch(
  () => props.account,
  (a) => requestResetCount(a.id),
  { immediate: true }
)
</script>

<template>
  <template v-if="count !== undefined">
    <SChip clickable size="xs" :tone="count ? 'accent' : 'neutral'" :title="t('reset.badgeTitle', { n: count })" data-testid="codex-reset-badge" @click="open = true">{{
      t('reset.badge', { n: count })
    }}</SChip>
    <SModal v-model:open="open" :title="t('reset.modalTitle', { name: account.name || `#${account.id}` })" width="lg">
      <CodexResetTab v-if="open" :account="account" />
    </SModal>
  </template>
</template>
