
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Z}from"./chunk-8824h7w7.js";import{oi}from"./chunk-85eyj5gy.js";function Rrt(n){return n.replace(/[\r\n\u2028\u2029]+/g," ")}function Vqe(n,r){let e=oi(n);if(e.length<=r)return e;let t=Z(e,r),o=Array.from(e.slice(t.length)).length;return`${t} \u2026 (${o} more characters follow that are NOT shown in this message)`}
export{Rrt,Vqe};
