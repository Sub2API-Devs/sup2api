
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{p}from"./chunk-kpa9nk58.js";import{Qo}from"./chunk-e6aww6q8.js";import{o,oe,A,u,T}from"./chunk-7vp249v4.js";var yHs="Resumed agent. Its final report is not in this message.",_Hs="Resumed agent. Its final report follows this JSON, framed by the harness.";function _vo({displayName:e,content:n}){return`Resumed agent ${e}. Result:

${Qo(n,`
`)||"(no text output)"}`}var bvo=p(()=>u({message:o().optional(),display:o().optional(),inlineHandback:u({displayName:o(),content:A(u({type:T("text"),text:o()}))}).optional().catch(void 0),routing:oe().optional(),request_id:oe().optional(),target:oe().optional()}));function Svo(e){if(e.routing)return;if(e.request_id!==void 0&&e.target!==void 0)return;return e.display??(e.inlineHandback?_vo(e.inlineHandback):e.message)}function bHs(e){let n=bvo().safeParse(e);return n.success?Svo(n.data)??"":""}
export{yHs,_Hs,_vo,bvo,Svo,bHs};
