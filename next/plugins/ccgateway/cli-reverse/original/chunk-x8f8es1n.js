
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{UG}from"./chunk-p5akk6be.js";import{_ps,Lio,Hio,bps}from"./chunk-dcmhvw5a.js";var t={marks:["claude","anthropic","anthropics"],builtinLead:"cc-plugin",products:["claude-code","claude-mods"]},d=[...t.marks,t.builtinLead],c=[...t.marks,...t.products],E=(e)=>new Set(e.map((s)=>Hio(s).join(""))),l=E(d),p=E(c),_=Math.max(...[...l,...p].map((e)=>e.length)),R=(e)=>new Intl.ListFormat("en",{type:"disjunction"}).format(e.map((s)=>`"${s}"`)),g=R(d.map((e)=>`${e}-`)),m=`A third party's plugin name cannot start with ${g}, be ${R(c)}, or put "official" beside "claude" or "anthropic".`,a="Name it for what it does.",oNs="If this is one of Anthropic's own plugins, validate the marketplace that lists it.";function AQe(e){let s=Lio.test(e),n=(s?UG(e):e).toLowerCase(),r=s?`"${e}" (read as "${n}")`:`"${e}"`,i=Hio(n);if([...bps(n,_)].some(({joined:o,isWhole:u})=>(u?p:l).has(o))||_ps.test(n)||_ps.test(i.join("")))return{severity:"error",message:`Plugin name ${r} is reserved: it passes as one of Anthropic's own. ${m} `+a};return t.marks.some((o)=>i.includes(o))?{severity:"warning",message:`Plugin name ${r} reads as one of Anthropic's own. `+a}:void 0}
export{oNs,AQe};
