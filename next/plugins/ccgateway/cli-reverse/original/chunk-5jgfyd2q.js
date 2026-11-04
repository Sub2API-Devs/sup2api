
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
function X$e(e){return typeof e==="object"&&e!==null&&"type"in e&&e.type==="tool_reference"}function Usr(e,r){return`${e}
${r}`}function KTt(e){return X$e(e)&&"tool_name"in e&&typeof e.tool_name==="string"}function nst(e){return typeof e==="object"&&e!==null&&"type"in e&&e.type==="tool_result"&&"content"in e&&Array.isArray(e.content)}function iwe(e,r){let s=[];for(let o of e){if(r?.surfacedOnWire!==void 0&&o.type==="attachment"&&o.attachment.type==="deferred_tools_delta"){let n=o.attachment.surfacedNames;for(let t of Array.isArray(n)?n:[])if(typeof t==="string"&&r.surfacedOnWire.has(t))s.push({toolUseId:o.uuid,toolName:t});continue}if(o.type!=="user")continue;let c=o.message?.content;if(!Array.isArray(c))continue;for(let n of c){if(!nst(n)||typeof n.tool_use_id!=="string")continue;for(let t of n.content)if(KTt(t))s.push({toolUseId:n.tool_use_id,toolName:t.tool_name})}}return s}
export{X$e,Usr,KTt,nst,iwe};
