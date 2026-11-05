
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{U2}from"./chunk-72da5r6r.js";import{IIs,Dwo,Lwo,OIs}from"./chunk-z20c443b.js";var n={marks:["claude","anthropic","anthropics"],builtinLead:"cc-plugin",products:["claude-code","claude-mods"]},c=[...n.marks,n.builtinLead],E=[...n.marks,...n.products],l=(e)=>new Set(e.map((s)=>Lwo(s).join(""))),p=l(c),u=l(E),m=Math.max(...[...p,...u].map((e)=>e.length)),a=(e)=>new Intl.ListFormat("en",{type:"disjunction"}).format(e.map((s)=>`"${s}"`)),d="Name it for what it does.",G8s="If this is one of Anthropic's own plugins, validate the marketplace that lists it.";function Lrt(e){let s=Dwo.test(e),o=(s?U2(e):e).toLowerCase(),r=s?`"${e}" (read as "${o}")`:`"${e}"`,i=Lwo(o);if([...OIs(o,m)].some(({joined:t,isWhole:g})=>(g?u:p).has(t))||IIs.test(o)||IIs.test(i.join("")))return{severity:"error",message:`Plugin name ${r} is reserved: it passes as one of Anthropic's own. A third party's plugin name cannot start with ${a(c.map((t)=>`${t}-`))}, be ${a(E)}, or put "official" beside "claude" or "anthropic". `+d};return n.marks.some((t)=>i.includes(t))?{severity:"warning",message:`Plugin name ${r} reads as one of Anthropic's own. `+d}:void 0}
export{G8s,Lrt};
