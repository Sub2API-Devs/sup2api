
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{ltr,gYe}from"./chunk-wh5pkk8m.js";function Ugn(e,n){return{targets:e.filter((t)=>ltr(t,n)),outOfBandNote:gYe(e,!0,n)}}async function Bgn(e,n){let t=await Promise.allSettled(e.map((o)=>n(o.name))),r=0;for(let o of t)if(o.status==="fulfilled"&&o.value.client.type==="connected")r++;return{results:t,connected:r}}
export{Ugn,Bgn};
