
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Bf}from"./chunk-2k62t388.js";var a=120000,s=600000;function $z(n=process.env){let e=n.BASH_DEFAULT_TIMEOUT_MS;if(e){let t=Bf(e);if(!isNaN(t)&&t>0)return t}return a}function G8(n=process.env){let e=n.BASH_MAX_TIMEOUT_MS;if(e){let t=Bf(e);if(!isNaN(t)&&t>0)return Math.max(t,$z(n))}return Math.max(s,$z(n))}var yAi=1800000,Aoo=7200000;function _Ai(n){return Math.min(Math.max(n,G8()),2147483647)}function bAi(n,e){return Math.max(n,$z(e))}function pct(n,e){return n!==void 0&&n>0?e:void 0}var i=2000;function jmr({requestedTimeoutMs:n,isMainAgent:e,canAutoBackground:t,subagentCapMs:o=0,env:u=process.env}){if(!t)return n;let r=e?Bf(u.CLAUDE_CODE_AUTO_BACKGROUND_TIMEOUT_MS):o;if(isNaN(r)||r<=0)return n;return Math.min(n,Math.max(r,i))}
export{$z,G8,yAi,Aoo,_Ai,bAi,pct,jmr};
