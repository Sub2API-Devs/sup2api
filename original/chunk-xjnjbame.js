
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{ge}from"./chunk-886baxky.js";var u=["BUN_GC_TIMER_INTERVAL","MIMALLOC_PURGE_HOLES_MIN_INTERVAL","BUN_IDLE_GC_SECONDS","MIMALLOC_PURGE_DELAY","BUN_JSC_useFTLJIT","BUN_JSC_percentCPUPerMBForEdenTimer","BUN_JSC_percentCPUPerMBForFullTimer"],e=ge({isNoted:!1,namesSet:void 0,purgeDelayMs:void 0},(n)=>{n.isNoted=!1,n.namesSet=void 0,n.purgeDelayMs=void 0});function vYi(){if(e.isNoted)return;e.isNoted=!0;try{let n=0;for(let[r,s]of u.entries())if(process.env[s])n|=1<<r;let t=process.env.MIMALLOC_PURGE_DELAY;e.purgeDelayMs=t!==void 0&&/^\d{1,7}$/.test(t)?Number(t):void 0,e.namesSet=n}catch{e.purgeDelayMs=void 0}}function IHn(){return e.namesSet}function OHn(){return e.purgeDelayMs}
export{vYi,IHn,OHn};
