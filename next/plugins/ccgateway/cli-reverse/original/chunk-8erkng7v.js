
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{v4}from"./chunk-5ythzcas.js";import{v,q5}from"./chunk-exfmq47h.js";import{i}from"./chunk-xjnnz630.js";import{yf,pKe}from"./chunk-qxwk69tt.js";import{v8e,Qis}from"./chunk-ahnc684e.js";var t=300000;function Nmr(){return i.CLAUDE_CODE_BRIEF||q5("tengu_kairos_brief",!1,t)}function Mda(e){if(!e.includes(yf)&&!e.includes(pKe))return!1;if(v8e())return!1;return Nmr()}function L0(){return v4()&&Nmr()||Qis()}var r=`In brief mode, plain assistant text is hidden from the user \u2014 only ${yf} reaches them. Call it now with your substantive reply for this turn. Do not mention this reminder; the message should read as if you wrote it unprompted, addressing only what the user actually asked. If you genuinely have nothing useful to tell the user, you may end the turn without calling it.`;function Dda(){let e=v("tengu_kairos_brief_stop_hook_text","");return typeof e==="string"&&e.length>0?e:r}
export{Nmr,Mda,L0,Dda};
