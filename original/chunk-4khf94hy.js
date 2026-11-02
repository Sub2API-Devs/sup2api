
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Zu}from"./chunk-cgcrer2m.js";var a=120000,s=600000;function mpe(n=process.env){let e=n.BASH_DEFAULT_TIMEOUT_MS;if(e){let t=Zu(e);if(!isNaN(t)&&t>0)return t}return a}function gpe(n=process.env){let e=n.BASH_MAX_TIMEOUT_MS;if(e){let t=Zu(e);if(!isNaN(t)&&t>0)return Math.max(t,mpe(n))}return Math.max(s,mpe(n))}var Ssi=1800000,_5r=7200000;function wsi(n){return Math.min(Math.max(n,gpe()),2147483647)}function Esi(n,e){return Math.max(n,mpe(e))}function EVt(n,e){return n!==void 0&&n>0?e:void 0}var i=2000;function jnr({requestedTimeoutMs:n,isMainAgent:e,canAutoBackground:t,subagentCapMs:o=0,env:u=process.env}){if(!t)return n;let r=e?Zu(u.CLAUDE_CODE_AUTO_BACKGROUND_TIMEOUT_MS):o;if(isNaN(r)||r<=0)return n;return Math.min(n,Math.max(r,i))}
export{mpe,gpe,Ssi,_5r,wsi,Esi,EVt,jnr};
