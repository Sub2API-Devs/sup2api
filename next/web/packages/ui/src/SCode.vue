<script setup lang="ts">
// <pre class="code-block"> (block) or inline <code>. `text` or the default
// slot supplies the content; `wrap` = false keeps long lines on one line.
withDefaults(defineProps<{ inline?: boolean; text?: string; wrap?: boolean }>(), { wrap: true })
</script>

<template>
  <code v-if="inline" class="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-800 dark:bg-dark-700 dark:text-gray-200"><slot>{{ text }}</slot></code>
  <pre v-else class="code-block" :class="wrap ? '' : '!whitespace-pre !break-normal'"><slot>{{ text }}</slot></pre>
</template>
