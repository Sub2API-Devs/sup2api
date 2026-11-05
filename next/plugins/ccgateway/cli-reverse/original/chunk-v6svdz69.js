
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{d}from"./chunk-63094ahz.js";import{t}from"./chunk-6hadbefe.js";import{nc,xo,bl,Dk}from"./chunk-rmd7n4gq.js";import{Kre}from"./chunk-d8ygv17y.js";async function r9n(r,o){if(!Kre())return;try{let e=await xo(r,o);if(!e||!bl(e)||e.state==="stopped"||Dk(e))return;await nc(r,{...e,state:"stopped",updatedAt:new Date().toISOString()},o)}catch(e){t(`stop not recorded on the job's row: ${d(e)}`,{level:"error"})}}
export{r9n};
