
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{P}from"./chunk-bb1a67wr.js";import{jO}from"./chunk-z20c443b.js";import{Lg}from"./chunk-71parphm.js";function P9n(){if(P()!=="windows"||!process.stdin.isTTY)return;try{process.stdin.setRawMode(!0),process.stdin.setRawMode(!1)}catch{}}function I9n(o){{let t=(e)=>e.toUpperCase()===jO;for(let e of Object.keys(o).filter(t))delete o[e];let r=Lg();for(let e of Object.keys(r).filter(t))o[e]=r[e]}}
export{P9n,I9n};
