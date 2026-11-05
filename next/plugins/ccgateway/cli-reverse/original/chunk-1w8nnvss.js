
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{t}from"./chunk-6hadbefe.js";import{qyo,TTs,KW,yn}from"./chunk-exfmq47h.js";import{DAe}from"./chunk-9fd91z25.js";import{createHash as g}from"crypto";function ort(){let{value:e,source:r}=yn(DAe,null);return{flag:n(e),source:r}}function n(e){let{flag:r,problem:o}=qyo(e);if(o!==void 0)t(`org-config gate: ${DAe} is malformed (${o}); treating as off`,{level:"warn"});return r}async function SHo(e,r,o){let a=await TTs(DAe,null,e,r,o);return a.served?{flag:n(a.value),source:"payload"}:void 0}function rsa(e=ort,r=KW){let{flag:o,source:a}=e();return o.enabled||a==="fallback"&&r()}function wHo(e){let r=g("sha256").update(`org_config_gate:${e}`).digest("hex");return parseInt(r.slice(0,8),16)%100}function EHo(e,r){return e.enabled&&r<e.percent}
export{ort,SHo,rsa,wHo,EHo};
