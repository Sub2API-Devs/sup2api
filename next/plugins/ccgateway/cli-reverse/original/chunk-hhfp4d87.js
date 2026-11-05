
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{F}from"./chunk-5ythzcas.js";import{W}from"./chunk-0qffyy27.js";import{Z5}from"./chunk-fmy4vc7c.js";import{gf}from"./chunk-0z575c9w.js";var d=new W(()=>({degraded:!1}));function t(){return d.of(F().host)}function ihe(n,r){if(n!==gf)return;let e=t();if(r===void 0){e.degraded=!1;return}let o=Z5(r);if(o==="downstream_unreachable")e.degraded=!0;else if(o==="downstream_error")e.degraded=!1}function oii(){return t().degraded}
export{ihe,oii};
