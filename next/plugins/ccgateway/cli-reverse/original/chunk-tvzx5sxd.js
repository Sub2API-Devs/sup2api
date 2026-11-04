
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{vV}from"./chunk-ndmse9kj.js";import{v,J4}from"./chunk-aepeg2w5.js";import{i}from"./chunk-jhrww53q.js";import{Pp,Pdt}from"./chunk-f5te1san.js";import{Mqe,d5o}from"./chunk-gt4x42hj.js";var t=300000;function Nnr(){return i.CLAUDE_CODE_BRIEF||J4("tengu_kairos_brief",!1,t)}function ZKi(e){if(!e.includes(Pp)&&!e.includes(Pdt))return!1;if(Mqe())return!1;return Nnr()}function fH(){return vV()&&Nnr()||d5o()}var r=`In brief mode, plain assistant text is hidden from the user \u2014 only ${Pp} reaches them. Call it now with your substantive reply for this turn. Do not mention this reminder; the message should read as if you wrote it unprompted, addressing only what the user actually asked. If you genuinely have nothing useful to tell the user, you may end the turn without calling it.`;function eVi(){let e=v("tengu_kairos_brief_stop_hook_text","");return typeof e==="string"&&e.length>0?e:r}
export{Nnr,ZKi,fH,eVi};
