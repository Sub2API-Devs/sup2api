
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Xee}from"./chunk-1vkx5nq0.js";import{qn}from"./chunk-8824h7w7.js";function QVn(e,o=new Date,n="stored"){let r=a(o),t=g(p(e,n));return t?`${r}-${t}.txt`:`conversation-${r}.txt`}function a(e){let o=e.getFullYear(),n=String(e.getMonth()+1).padStart(2,"0"),r=String(e.getDate()).padStart(2,"0"),t=String(e.getHours()).padStart(2,"0"),s=String(e.getMinutes()).padStart(2,"0"),i=String(e.getSeconds()).padStart(2,"0");return`${o}-${n}-${r}-${t}${s}${i}`}function p(e,o="stored"){let n=e.find((s)=>s.type==="user"&&s.turnCompanion!==!0);if(!n||n.type!=="user")return"";let r=n.message?.content,t="";if(typeof r==="string")t=(o==="shown"?Xee(r,n.pluginPrompt):r).trim();else if(Array.isArray(r)){let s=r.findLast((i)=>i.type==="text");if(s&&"text"in s)t=s.text.trim()}if(t=qn(t),t.length>50)t=t.substring(0,49)+"\u2026";return t}function g(e){return e.toLowerCase().replace(/[^a-z0-9\s-]/g,"").replace(/\s+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"")}
export{QVn};
