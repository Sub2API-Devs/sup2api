
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{tt}from"./chunk-ndmse9kj.js";import{kCt}from"./chunk-re9y5nwg.js";var t=new tt(()=>({byToolUse:new Map}));function dNo(n,e,i){t.of(n).byToolUse.set(e,i),kCt(n,e,()=>{J5n(n,e)})}function J5n(n,e){t.peek(n)?.byToolUse.delete(e)}function J2i(n,e){return e!==void 0&&t.peek(n)?.byToolUse.has(e)===!0}function cNo(n,e){if(e===void 0)return;let i=t.peek(n)?.byToolUse.get(e);return J5n(n,e),i}
export{dNo,J5n,J2i,cNo};
