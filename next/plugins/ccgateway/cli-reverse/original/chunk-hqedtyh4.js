
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Le,fe}from"./chunk-exfmq47h.js";import{a}from"./chunk-my2r02mp.js";import{L,Ys}from"./chunk-xea05003.js";var l=256;function xYs(e){let n=new Set(Ys(fe().seenSecurityWarnings));return e.filter((r)=>r.seenKey===void 0||!n.has(r.seenKey))}function PYs(e,n){if(e.length===0)return;Le((r)=>{let i=Ys(r.seenSecurityWarnings),o=new Set(i),t=L(e).filter((s)=>!o.has(s));if(t.length===0)return r;return{...r,seenSecurityWarnings:[...i,...t].slice(-l)}},n)}async function R5n(){try{let[{getAllBaseTools:e},{collectPermissionRuleAdvisories:n},{loadAllPermissionRulesFromDisk:r}]=await Promise.all([import("./chunk-f0g95g8t.js"),import("./chunk-f1jdd43t.js"),import("./chunk-sbcq3ebg.js")]);return L(n(r(),e).map((i)=>i.line))}catch(e){return a(e),[]}}
export{xYs,PYs,R5n};
