
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{F}from"./chunk-5ythzcas.js";import{W}from"./chunk-0qffyy27.js";import{a}from"./chunk-my2r02mp.js";var s=new W(()=>({alreadyReported:new Set}));function $V(r){try{let e=s.of(F().host);if(!e.alreadyReported.has(r))e.alreadyReported.add(r),e.listener?.(r)}catch(e){a(e)}}
export{$V};
