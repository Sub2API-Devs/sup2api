
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{WDt}from"./chunk-2c3jp4kn.js";import{Je}from"./chunk-r4yj9pae.js";var t=new Je(()=>({byToolUse:new Map}));function kVo(n,e,i){t.of(n).byToolUse.set(e,i),WDt(n,e,()=>{QQn(n,e)})}function QQn(n,e){t.peek(n)?.byToolUse.delete(e)}function Qaa(n,e){return e!==void 0&&t.peek(n)?.byToolUse.has(e)===!0}function TVo(n,e){if(e===void 0)return;let i=t.peek(n)?.byToolUse.get(e);return QQn(n,e),i}
export{kVo,QQn,Qaa,TVo};
