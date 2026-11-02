
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{_Yn,Hze}from"./chunk-2sw13wfh.js";function Tan(e,n){return{targets:e.filter((t)=>_Yn(t,n)),outOfBandNote:Hze(e,!0,n)}}async function Aan(e,n){let t=await Promise.allSettled(e.map((o)=>n(o.name))),r=0;for(let o of t)if(o.status==="fulfilled"&&o.value.client.type==="connected")r++;return{results:t,connected:r}}
export{Tan,Aan};
