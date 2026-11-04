
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{t}from"./chunk-cgr0tezp.js";import{rro,Eas,ej,wn}from"./chunk-aepeg2w5.js";import{FEe}from"./chunk-m8rdsjv5.js";import{createHash as g}from"crypto";function tQe(){let{value:e,source:r}=wn(FEe,null);return{flag:n(e),source:r}}function n(e){let{flag:r,problem:o}=rro(e);if(o!==void 0)t(`org-config gate: ${FEe} is malformed (${o}); treating as off`,{level:"warn"});return r}async function ywo(e,r,o){let a=await Eas(FEe,null,e,r,o);return a.served?{flag:n(a.value),source:"payload"}:void 0}function sGi(e=tQe,r=ej){let{flag:o,source:a}=e();return o.enabled||a==="fallback"&&r()}function _wo(e){let r=g("sha256").update(`org_config_gate:${e}`).digest("hex");return parseInt(r.slice(0,8),16)%100}function bwo(e,r){return e.enabled&&r<e.percent}
export{tQe,ywo,sGi,_wo,bwo};
