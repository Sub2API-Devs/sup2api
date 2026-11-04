
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{B}from"./chunk-ndmse9kj.js";import{W}from"./chunk-x7vma94a.js";import{rY}from"./chunk-cyj440je.js";import{xu}from"./chunk-ptag3qm7.js";var d=new W(()=>({degraded:!1}));function t(){return d.of(B().host)}function Due(n,r){if(n!==xu)return;let e=t();if(r===void 0){e.degraded=!1;return}let o=rY(r);if(o==="downstream_unreachable")e.degraded=!0;else if(o==="downstream_error")e.degraded=!1}function MKs(){return t().degraded}
export{Due,MKs};
