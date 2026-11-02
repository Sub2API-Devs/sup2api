
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{_,t}from"./chunk-cgr0tezp.js";import{Fn,fn}from"./chunk-gda5w2fs.js";import{$st,iYe}from"./chunk-82kqcve8.js";function GLt(o){return o.flatMap((e)=>$st(iYe([{type:"addRules",destination:"session",behavior:"allow",rules:[Fn(e)]}])).map(fn))}function kNn(o,e){let l=GLt(e);if(l.length===0)return o;return t(`Applying permission update: Adding ${l.length} allow rule(s) to source 'mcpMount': ${_(l)}`),{...o,alwaysAllowRules:{...o.alwaysAllowRules,mcpMount:[...o.alwaysAllowRules.mcpMount??[],...l]}}}function TNn(o,e,l){let s=o.alwaysAllowRules.mcpMount??[],r=GLt(e),n=l==="every"?s.filter((i)=>!r.includes(i)):[...s];if(l==="one")for(let i of r){let u=n.lastIndexOf(i);if(u!==-1)n.splice(u,1)}if(n.length===s.length)return o;return t(`Applying permission update: Removing ${s.length-n.length} allow rule(s) from source 'mcpMount', of ${_(r)}`),{...o,alwaysAllowRules:{...o.alwaysAllowRules,mcpMount:n}}}
export{GLt,kNn,TNn};
