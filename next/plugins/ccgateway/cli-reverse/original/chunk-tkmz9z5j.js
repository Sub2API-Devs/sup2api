
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{fu}from"./chunk-ap4nnw1y.js";var e="self_hosted_runner_";function vmn(n){return n.startsWith(e)}function M3n(n){return fu([...n]).some(vmn)}function qFo(n){return fu([n]).filter((t)=>!vmn(t)).join(",")}function YFo(n){if(n===void 0)return!1;let t=typeof n==="string"?n:String(n);return fu([t]).some(vmn)}function Z8s(n){let t=n.tools;if(t===void 0)return n;let o=typeof t==="string"?t:String(t);if(!YFo(o))return typeof t==="string"?n:{...n,tools:o};return{...n,tools:qFo(o)}}
export{vmn,M3n,qFo,YFo,Z8s};
