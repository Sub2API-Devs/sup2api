
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
function A9e(e){return typeof e==="object"&&e!==null&&"type"in e&&e.type==="tool_reference"}function f_r(e,r){return`${e}
${r}`}function dMt(e){return A9e(e)&&"tool_name"in e&&typeof e.tool_name==="string"}function Rut(e){return typeof e==="object"&&e!==null&&"type"in e&&e.type==="tool_result"&&"content"in e&&Array.isArray(e.content)}function Gke(e,r){let s=[];for(let o of e){if(r?.surfacedOnWire!==void 0&&o.type==="attachment"&&o.attachment.type==="deferred_tools_delta"){let n=o.attachment.surfacedNames;for(let t of Array.isArray(n)?n:[])if(typeof t==="string"&&r.surfacedOnWire.has(t))s.push({toolUseId:o.uuid,toolName:t});continue}if(o.type!=="user")continue;let c=o.message?.content;if(!Array.isArray(c))continue;for(let n of c){if(!Rut(n)||typeof n.tool_use_id!=="string")continue;for(let t of n.content)if(dMt(t))s.push({toolUseId:n.tool_use_id,toolName:t.tool_name})}}return s}
export{A9e,f_r,dMt,Rut,Gke};
