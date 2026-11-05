
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{p}from"./chunk-k6qypy1d.js";import{_s}from"./chunk-5xgkngpb.js";import{o,oe,A,u,T}from"./chunk-m4y44r15.js";var E3s="Resumed agent. Its final report is not in this message.",v3s="Resumed agent. Its final report follows this JSON, framed by the harness.";function BNo({displayName:e,content:n}){return`Resumed agent ${e}. Result:

${_s(n,`
`)||"(no text output)"}`}var jNo=p(()=>u({message:o().optional(),display:o().optional(),inlineHandback:u({displayName:o(),content:A(u({type:T("text"),text:o()}))}).optional().catch(void 0),routing:oe().optional(),request_id:oe().optional(),target:oe().optional()}));function WNo(e){if(e.routing)return;if(e.request_id!==void 0&&e.target!==void 0)return;return e.display??(e.inlineHandback?BNo(e.inlineHandback):e.message)}function k3s(e){let n=jNo().safeParse(e);return n.success?WNo(n.data)??"":""}
export{E3s,v3s,BNo,jNo,WNo,k3s};
