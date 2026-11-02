
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{ne}from"./chunk-m41h77x8.js";import{si}from"./chunk-t0gq9gyw.js";function gQe(n){return n.replace(/[\r\n\u2028\u2029]+/g," ")}function gGe(n,r){let e=si(n);if(e.length<=r)return e;let t=ne(e,r),o=Array.from(e.slice(t.length)).length;return`${t} \u2026 (${o} more characters follow that are NOT shown in this message)`}
export{gQe,gGe};
