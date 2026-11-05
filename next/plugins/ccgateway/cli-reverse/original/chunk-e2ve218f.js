
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{bss}from"./chunk-rkc3d9jc.js";import{N}from"./chunk-63094ahz.js";import{an}from"./chunk-exfmq47h.js";import{a}from"./chunk-my2r02mp.js";import{BKe,U1}from"./chunk-9ys74nhz.js";import{YPt}from"./chunk-kfh980z3.js";function R8n(e){let o=e.trim();return o!==""&&!o.startsWith("/")}var KUo=()=>!1;var VUo=()=>U1()&&!BKe()&&an("tengu_quiet_ember",KUo());var x8n={name:"cc-plugin-responsive-mode",description:"Responsive mode: Claude replies to you in a sentence before thinking or using tools, on every prompt",isAvailable:VUo,defaultEnabled:!1};function zGr({text:e,pastedContents:o,isSentByPerson:t,wait:r}){if(!t||r||!R8n(e))return!1;try{return bss(e,o).length===0&&YPt(x8n.name)}catch(i){return a(N(i)),!1}}
export{R8n,KUo,VUo,x8n,zGr};
