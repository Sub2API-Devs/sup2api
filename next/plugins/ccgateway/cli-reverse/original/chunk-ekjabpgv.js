
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{DAe}from"./chunk-9fd91z25.js";function a(n,r){let e=n.cachedGrowthBookFeatures;if(typeof e!=="object"||e===null||Array.isArray(e)||Object.keys(e).length===0)return!0;let o=n.growthBookOverrides;return DAe in e||typeof o==="object"&&o!==null&&DAe in o||r!==void 0&&r.includes(DAe)}export{a as orgConfigGateFlagOnHand};
