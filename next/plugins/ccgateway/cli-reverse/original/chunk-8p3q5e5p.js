
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Vd}from"./chunk-ndmse9kj.js";import{wt}from"./chunk-fnk5kvbf.js";import{VO}from"./chunk-q8cqcff6.js";import{Ft,v}from"./chunk-aepeg2w5.js";function dln(){return VO("autoContinueAtUsageLimit")[0]}function QKn(e){return dln()??e==="absent"}var u="tengu_marble_heron";function g0r(){let e=n();return o(e)?e:{}}function pze(){let e=n();return r(o(e)?e.enabled:e)}function cln(){return Vd()&&!Ft()&&!wt()}function zjs(){return cln()&&pze()}function ZKn(){return r(g0r().autoArm)}function n(){return v(u,{})}function o(e){return typeof e==="object"&&e!==null&&!Array.isArray(e)}function r(e){if(e===void 0)return!0;if(typeof e==="string"){let t=e.trim().toLowerCase();return t!==""&&t!=="false"&&t!=="0"}return Boolean(e)}
export{dln,QKn,g0r,pze,cln,zjs,ZKn};
