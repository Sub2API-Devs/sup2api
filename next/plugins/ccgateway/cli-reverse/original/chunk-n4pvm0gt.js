
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{t}from"./chunk-cgr0tezp.js";import{Y0}from"./chunk-zfbhezv9.js";import{d_,LM}from"./chunk-e6aww6q8.js";import{zA}from"./chunk-9rkt9tdt.js";function qV(e){let o=d_(),s=!!e.isAutoModeAvailable&&o;if(!s)t(`[auto-mode] canCycleToAuto=false: ctx.isAutoModeAvailable=${e.isAutoModeAvailable} isAutoModeGateEnabled=${o} reason=${LM()}`);return s}function Jsn(e){return!!e.isBypassPermissionsModeAvailable&&!zA()}function Qsn(e,o){switch(e.mode){case"default":return"acceptEdits";case"acceptEdits":return"plan";case"plan":if(Jsn(e))return"bypassPermissions";if(qV(e))return"auto";return"default";case"bypassPermissions":if(qV(e))return"auto";return"default";case"dontAsk":return"default";default:return"default"}}function JAo(e,o,s){let n=Qsn(e,o);return{nextMode:n,context:Y0(e.mode,n,e,s)}}
export{qV,Jsn,Qsn,JAo};
