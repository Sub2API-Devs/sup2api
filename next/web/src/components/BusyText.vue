<script setup lang="ts">
// A running action as one line of small muted text: spinner + label.
import { SSpinner } from '@sub2api/ui'
</script>

<template>
  <span class="inline-flex items-center gap-2 text-xs text-fg-muted" role="status"><SSpinner size="sm" decorative /><slot /></span>
</template>
