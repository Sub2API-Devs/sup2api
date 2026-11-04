
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
var r,a;function n(){if(r!==void 0&&a==="external")return r;return a="external",r=[],r}function qRs(){return n().map((e)=>e.id)}function YRs(e){for(let t of n()){let o=t.digests.find((i)=>i.sha256===e);if(o)return{template:t,label:o.label}}return}function Vpt(e){return n().find((t)=>t.id===e)}function W$n(e){return e.event==="PreToolUse"}function G$n(){return!0}
export{qRs,YRs,Vpt,W$n,G$n};
