
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{qu}from"./chunk-gda5w2fs.js";var e="self_hosted_runner_";function Xon(n){return n.startsWith(e)}function oWn(n){return qu([...n]).some(Xon)}function Kko(n){return qu([n]).filter((t)=>!Xon(t)).join(",")}function Vko(n){if(n===void 0)return!1;let t=typeof n==="string"?n:String(n);return qu([t]).some(Xon)}function w0s(n){let t=n.tools;if(t===void 0)return n;let o=typeof t==="string"?t:String(t);if(!Vko(o))return typeof t==="string"?n:{...n,tools:o};return{...n,tools:Kko(o)}}
export{Xon,oWn,Kko,Vko,w0s};
