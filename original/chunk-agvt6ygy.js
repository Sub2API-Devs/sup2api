
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{ASe,h2}from"./chunk-g3xfp0ds.js";function rr(e,r,o="foreground"){return(t)=>{if(!e)return t;if(e.startsWith("rgb(")||e.startsWith("#")||e.startsWith("ansi256(")||e.startsWith("ansi:"))return ASe(t,e,o);let i=typeof r==="string"?h2(r):r;return ASe(t,i[e],o)}}
export{rr};
