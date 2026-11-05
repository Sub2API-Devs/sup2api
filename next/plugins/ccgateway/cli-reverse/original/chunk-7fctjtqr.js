
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{_,t}from"./chunk-6hadbefe.js";import{pn}from"./chunk-ap4nnw1y.js";import{P_}from"./chunk-gg17c06d.js";import{yft,eXe}from"./chunk-a2q0x549.js";function g1t(o){return o.flatMap((e)=>yft(eXe([{type:"addRules",destination:"session",behavior:"allow",rules:[P_(e,"allow")]}])).map(pn))}function wKn(o,e){let l=g1t(e);if(l.length===0)return o;return t(`Applying permission update: Adding ${l.length} allow rule(s) to source 'mcpMount': ${_(l)}`),{...o,alwaysAllowRules:{...o.alwaysAllowRules,mcpMount:[...o.alwaysAllowRules.mcpMount??[],...l]}}}function EKn(o,e,l){let r=o.alwaysAllowRules.mcpMount??[],s=g1t(e),n=l==="every"?r.filter((i)=>!s.includes(i)):[...r];if(l==="one")for(let i of s){let u=n.lastIndexOf(i);if(u!==-1)n.splice(u,1)}if(n.length===r.length)return o;return t(`Applying permission update: Removing ${r.length-n.length} allow rule(s) from source 'mcpMount', of ${_(s)}`),{...o,alwaysAllowRules:{...o.alwaysAllowRules,mcpMount:n}}}
export{g1t,wKn,EKn};
