
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Rl}from"./chunk-5ythzcas.js";import{Tt}from"./chunk-sbrfdm61.js";import{xD}from"./chunk-5fn9rb8r.js";import{jt,v}from"./chunk-exfmq47h.js";function Ayn(){return xD("autoContinueAtUsageLimit")[0]}function I7n(e){return Ayn()??e==="absent"}var u="tengu_marble_heron";function QVr(){let e=n();return o(e)?e:{}}function z4e(){let e=n();return r(o(e)?e.enabled:e)}function Cyn(){return Rl()&&!jt()&&!Tt()}function wti(){return Cyn()&&z4e()}function O7n(){return r(QVr().autoArm)}function n(){return v(u,{})}function o(e){return typeof e==="object"&&e!==null&&!Array.isArray(e)}function r(e){if(e===void 0)return!0;if(typeof e==="string"){let t=e.trim().toLowerCase();return t!==""&&t!=="false"&&t!=="0"}return Boolean(e)}
export{Ayn,I7n,QVr,z4e,Cyn,wti,O7n};
