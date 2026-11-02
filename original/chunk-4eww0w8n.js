
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{t}from"./chunk-cgr0tezp.js";import{H}from"./chunk-q3kq8hyf.js";function yCi(n){switch(n){case"hipaa":return"HIPAA";case"zdr":return"ZDR (Zero Data Retention)";default:return t(`Unknown compliance_taint '${n}' from policyLimits`,{level:"warn"}),r}}var r="Organization policy",MIt="Per your organization's policy, some features are limited",ayr="HIPAA configured",o=new Set(["hipaa","zdr"]);function MPn(n){return o.has(n)||!1}function DPn(n){let e=H(n),i=e.filter(MPn);if(i.length===e.length)return i;return t(`Unknown compliance_taint values from policyLimits (${e.length-i.length})`,{level:"warn"}),[...i,r]}var a=new Set(["hipaa"]);function Cle(n){return H(n).filter((e)=>a.has(e))}
export{yCi,MIt,ayr,MPn,DPn,Cle};
