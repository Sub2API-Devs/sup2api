
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{t}from"./chunk-6hadbefe.js";import{L}from"./chunk-xea05003.js";function vVi(n){switch(n){case"hipaa":return"HIPAA";case"zdr":return"ZDR (Zero Data Retention)";default:return t(`Unknown compliance_taint '${n}' from policyLimits`,{level:"warn"}),r}}var r="Organization policy",c$t="Per your organization's policy, some features are limited",hPr="HIPAA configured",o=new Set(["hipaa","zdr"]);function HUn(n){return o.has(n)||!1}function NUn(n){let e=L(n),i=e.filter(HUn);if(i.length===e.length)return i;return t(`Unknown compliance_taint values from policyLimits (${e.length-i.length})`,{level:"warn"}),[...i,r]}var a=new Set(["hipaa"]);function Jue(n){return L(n).filter((e)=>a.has(e))}
export{vVi,c$t,hPr,HUn,NUn,Jue};
