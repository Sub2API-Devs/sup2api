
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Pe,ue}from"./chunk-aepeg2w5.js";import{l}from"./chunk-bbtre4r8.js";import{H,Fi}from"./chunk-q3kq8hyf.js";var a=256;function bDs(e){let n=new Set(Fi(ue().seenSecurityWarnings));return e.filter((r)=>r.seenKey===void 0||!n.has(r.seenKey))}function SDs(e,n){if(e.length===0)return;Pe((r)=>{let i=Fi(r.seenSecurityWarnings),o=new Set(i),t=H(e).filter((s)=>!o.has(s));if(t.length===0)return r;return{...r,seenSecurityWarnings:[...i,...t].slice(-a)}},n)}async function E1n(){try{let[{getAllBaseTools:e},{collectPermissionRuleAdvisories:n},{loadAllPermissionRulesFromDisk:r}]=await Promise.all([import("./chunk-swszrtvp.js"),import("./chunk-x38v0jj9.js"),import("./chunk-8qwkkc63.js")]);return H(n(r(),e).map((i)=>i.line))}catch(e){return l(e),[]}}
export{bDs,SDs,E1n};
