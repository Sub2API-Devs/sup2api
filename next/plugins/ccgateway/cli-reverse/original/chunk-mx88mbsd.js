
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{ne,Dr,_L}from"./chunk-m41h77x8.js";import{l}from"./chunk-bbtre4r8.js";import{JJr}from"./chunk-7jmp8260.js";import{UP}from"./chunk-vke0e3b0.js";import{sl}from"./chunk-22r83hv0.js";var KGn=5,lFs="Structured output was retracted by a model fallback and no retry produced a valid result",d=600;function dFs(t,r,e){if(r>0)return`Failed to provide surviving structured output after ${t} attempts (${r} retracted by a model fallback)`;let n=`Failed to provide valid structured output after ${t} attempts`;return e===void 0?n:`${n} \u2014 last StructuredOutput error: ${e}`}function gCo(t){let r=typeof t==="string"?t:Array.isArray(t)?t.flatMap((i)=>i.type==="text"?[i.text]:[]).join(`
`):void 0;if(r===void 0)return;let n=r.replace(/^<tool_use_error>/,"").replace(/<\/tool_use_error>$/,"").replace(JJr,`
`).split(`
`).map(_L).join(`
`),o=UP(n,{prependMarker:!1}).sanitized,u=Dr(o);if(u.length===0)return;let s=u.length>d?ne(u,d)+"\u2026":u;return UP(s,{prependMarker:!1}).sanitized}function cFs(t,r){try{let e=r===void 0?0:t.lastIndexOf(r)+1;return a(e===0?t:t.slice(e))}catch(e){l(e);return}}function a(t){let r=new Set;for(let e of t){if(e?.type!=="assistant")continue;let n=e.message.content;if(!Array.isArray(n))continue;for(let o of n)if(o.type==="tool_use"&&o.name===sl)r.add(o.id)}if(r.size===0)return;for(let e=t.length-1;e>=0;e--){let n=t[e];if(n?.type!=="user")continue;let o=n.message.content;if(!Array.isArray(o))continue;for(let u=o.length-1;u>=0;u--){let s=o[u];if(s?.type==="tool_result"&&s.is_error===!0&&r.has(s.tool_use_id))return gCo(s.content)}}return}
export{KGn,lFs,dFs,gCo,cFs};
