
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
var r,a;function n(){if(r!==void 0&&a==="external")return r;return a="external",r=[],r}function Jzs(){return n().map((e)=>e.id)}function Qzs(e){for(let t of n()){let o=t.digests.find((i)=>i.sha256===e);if(o)return{template:t,label:o.label}}return}function ISt(e){return n().find((t)=>t.id===e)}function XVn(e){return e.event==="PreToolUse"}function JVn(){return!0}
export{Jzs,Qzs,ISt,XVn,JVn};
