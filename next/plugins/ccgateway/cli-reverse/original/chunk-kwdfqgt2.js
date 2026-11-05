
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Z,Kr,Ak}from"./chunk-8824h7w7.js";import{a}from"./chunk-my2r02mp.js";import{oO}from"./chunk-hmzegypv.js";import{Nfo}from"./chunk-sahntffv.js";import{cl}from"./chunk-8nzbdydx.js";var _9n=5,MJs="Structured output was retracted by a model fallback and no retry produced a valid result",d=600;function DJs(t,r,e){if(r>0)return`Failed to provide surviving structured output after ${t} attempts (${r} retracted by a model fallback)`;let n=`Failed to provide valid structured output after ${t} attempts`;return e===void 0?n:`${n} \u2014 last StructuredOutput error: ${e}`}function o1o(t){let r=typeof t==="string"?t:Array.isArray(t)?t.flatMap((i)=>i.type==="text"?[i.text]:[]).join(`
`):void 0;if(r===void 0)return;let n=r.replace(/^<tool_use_error>/,"").replace(/<\/tool_use_error>$/,"").replace(Nfo,`
`).split(`
`).map(Ak).join(`
`),o=oO(n,{prependMarker:!1}).sanitized,u=Kr(o);if(u.length===0)return;let s=u.length>d?Z(u,d)+"\u2026":u;return oO(s,{prependMarker:!1}).sanitized}function LJs(t,r){try{let e=r===void 0?0:t.lastIndexOf(r)+1;return c(e===0?t:t.slice(e))}catch(e){a(e);return}}function c(t){let r=new Set;for(let e of t){if(e?.type!=="assistant")continue;let n=e.message.content;if(!Array.isArray(n))continue;for(let o of n)if(o.type==="tool_use"&&o.name===cl)r.add(o.id)}if(r.size===0)return;for(let e=t.length-1;e>=0;e--){let n=t[e];if(n?.type!=="user")continue;let o=n.message.content;if(!Array.isArray(o))continue;for(let u=o.length-1;u>=0;u--){let s=o[u];if(s?.type==="tool_result"&&s.is_error===!0&&r.has(s.tool_use_id))return o1o(s.content)}}return}
export{_9n,MJs,DJs,o1o,LJs};
