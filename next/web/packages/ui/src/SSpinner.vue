<script setup lang="ts">
withDefaults(defineProps<{ size?: 'sm' | 'md' | 'lg' }>(), { size: 'md' })
</script>

<template>
  <span
    class="inline-block animate-spin rounded-full border-2 border-current border-t-transparent"
    :class="size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-8 w-8' : 'h-5 w-5'"
    role="status"
  />
</template>
