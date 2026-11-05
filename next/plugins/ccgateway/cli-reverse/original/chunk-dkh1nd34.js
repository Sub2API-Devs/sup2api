
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{p}from"./chunk-k6qypy1d.js";import{OYe}from"./chunk-fr76nyng.js";import{o,A,$e}from"./chunk-m4y44r15.js";import{Je}from"./chunk-r4yj9pae.js";var N_n=new Je(()=>({}));function $_n(n,r){let e=n?.servers.get(r.name);return e!==void 0&&r.config.type==="http"&&r.config.url===e.url&&n?.heldSinceBoot(r.name)===!0?e.server:void 0}var t=p(()=>o().regex(/^[A-Za-z_][A-Za-z0-9_]{0,31}$/).refine((n)=>!(n in Object.prototype))),i=p(()=>A($e({arg:t(),local:t(),ref:t()})).length(1));function MZn(n){let r=i().safeParse(n?.[OYe]);if(!r.success)return;let[e]=r.data;return e!==void 0&&e.local!==e.ref?e:void 0}
export{N_n,$_n,MZn};
