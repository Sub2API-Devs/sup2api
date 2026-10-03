<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
defineProps<{ data: { label: string; subtitle: string; kind: string; size: number; color: string; dim: boolean; inactive: boolean; cluster: string; role: string; roleLabel: string; visitLabel: string }; selected: boolean }>()
</script>
<template>
  <div class="circle-node" :class="{ selected, dim: data.dim, inactive: data.inactive, 'is-primary': data.role === 'primary' }" :style="{ width: `${data.size}px`, height: `${data.size}px`, '--circle-color': data.color }" :title="`${data.cluster} · ${data.label} · ${data.subtitle} · ${data.roleLabel}`">
    <Handle type="target" :position="Position.Left" :connectable="false" />
    <span v-if="data.visitLabel" class="visit-badge">● {{ data.visitLabel }}</span>
    <div class="circle-inner"><span class="symbol">{{ data.role === 'primary' ? '★' : data.kind === 'gateway' ? '⇄' : data.kind === 'core' ? '◈' : '•' }}</span><span v-if="data.roleLabel" class="role-badge">{{ data.roleLabel }}</span></div>
    <div class="circle-label"><span class="name">{{ data.label }}</span><span class="subtitle">{{ data.subtitle }}</span><span v-if="data.kind !== 'gateway'" class="owner">{{ data.cluster }}</span></div>
    <Handle type="source" :position="Position.Right" :connectable="false" />
  </div>
</template>
<style scoped>
.circle-node { position: relative; border: 2px solid var(--circle-color); border-radius: 50%; background: color-mix(in srgb,var(--circle-color) 12%,white); box-shadow: 0 3px 18px #0f172a0d; cursor: grab; transition: opacity .15s,box-shadow .15s; }
.circle-node:active { cursor: grabbing; }
.visit-badge { position:absolute;z-index:2;bottom:calc(100% + 10px);left:50%;transform:translateX(-50%);padding:4px 9px;border-radius:14px;background:#0e7490;color:white;white-space:nowrap;font-size:17px;font-weight:700;box-shadow:0 2px 8px #0e749030; }
.circle-inner { display:flex;flex-direction:column;gap:4px;align-items:center;justify-content:center;height:100%;color:var(--circle-color); }
.is-primary { outline: 2px solid var(--circle-color); outline-offset: 6px; }
.role-badge { white-space:nowrap; border-radius: 12px; padding: 3px 2px; background: color-mix(in srgb,var(--circle-color) 15%,transparent); font-size: 18px; font-weight: 700; line-height: 1.3; text-align:center; }
.is-primary .role-badge { font-size:20px; }
.symbol {font-size:28px;font-weight:600;}
.circle-label { position:absolute; top:calc(100% + 7px); left:50%; transform:translateX(-50%); width:150px;text-align:center;pointer-events:none; }
.name,.subtitle,.owner { display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
.name { font-size:16px;font-weight:600;color:#334155; }.subtitle {margin-top:2px;font-size:12px;color:#64748b;}.owner {font-size:11px;color:#64748b;}
.selected {box-shadow:0 0 0 6px color-mix(in srgb,var(--circle-color) 22%,transparent);}
.dim {opacity:.22;}.inactive {border-style:dashed;filter:grayscale(.7);}
.circle-node :deep(.vue-flow__handle) { width:1px;height:1px;opacity:0;border:0;background:none;min-width:0;min-height:0; }
:global(.dark) .circle-node {background:color-mix(in srgb,var(--circle-color) 16%,#111827);}
:global(.dark) .name {color:#e2e8f0;}:global(.dark) .subtitle {color:#94a3b8;}
</style>
