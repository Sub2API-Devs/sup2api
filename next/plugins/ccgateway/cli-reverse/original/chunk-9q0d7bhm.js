
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{t}from"./chunk-6hadbefe.js";import{T$}from"./chunk-b9gx6r6h.js";import{Q_,vL}from"./chunk-5xgkngpb.js";import{rR}from"./chunk-qezsn2gc.js";function K4(e){let o=Q_(),s=!!e.isAutoModeAvailable&&o;if(!s)t(`[auto-mode] canCycleToAuto=false: ctx.isAutoModeAvailable=${e.isAutoModeAvailable} isAutoModeGateEnabled=${o} reason=${vL()}`);return s}function chn(e){return!!e.isBypassPermissionsModeAvailable&&!rR()}function uhn(e,o){switch(e.mode){case"default":return"acceptEdits";case"acceptEdits":return"plan";case"plan":if(chn(e))return"bypassPermissions";if(K4(e))return"auto";return"default";case"bypassPermissions":if(K4(e))return"auto";return"default";case"dontAsk":return"default";default:return"default"}}function $Bo(e,o,s){let n=uhn(e,o);return{nextMode:n,context:T$(e.mode,n,e,s)}}
export{K4,chn,uhn,$Bo};
