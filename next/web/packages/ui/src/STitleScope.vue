<script setup lang="ts">
import { provideTitleContext } from './titleContext'
const props = defineProps<{ title?: string }>()
provideTitleContext(() => props.title)
</script>
<template><div><slot /></div></template>
