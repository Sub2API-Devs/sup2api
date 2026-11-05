
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{ct}from"./chunk-8n1fbght.js";import{ae}from"./chunk-gcy2kcsb.js";import{HP}from"./chunk-8nzbdydx.js";import{$ce}from"./chunk-k3zg85zg.js";import{hae}from"./chunk-hf5txq1x.js";import{ELe}from"./chunk-x60qr24n.js";var Lpn=48;function Psa(n){if(!ELe())return null;let e=n.get($ce);return{subscribe:(r)=>e.onRunningScriptsChange(r),getSnapshot:()=>e.runningScripts(HP)}}function hNo(n,e){if(!ae())return null;let r=[...n.values()].sort((t,u)=>i(t)-i(u)||t.evalId-u.evalId),a=r[0]===void 0?0:i(r[0]),o=r.map((t)=>({phase:i(t),text:hae(t.description,e)})).filter(({text:t})=>t!==""),s=o[0];if(s===void 0||s.phase!==a)return null;let l=ct(s.text,Lpn);return o.length===1?l:`${l} +${o.length-1} more`}function gNo(n){if(!ae())return!1;return[...n.values()].some((e)=>i(e)===0)}function i(n){return n.late?2:n.startedAt===void 0?1:0}
export{Lpn,Psa,hNo,gNo};
