
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Mr}from"./chunk-5qsfbz2c.js";import{C}from"./chunk-63094ahz.js";import{Ro}from"./chunk-rmd7n4gq.js";import{Ym,Dt}from"./chunk-tvxatsbk.js";import{X}from"./chunk-mycxs6m3.js";import{mkdir as i}from"fs/promises";import{join as a}from"path";async function BYs(e,r){if(X()&&r!==void 0&&Mr(e)){await n(r,{namespace:"job",jobId:e});return}await i(Ro(e),{recursive:!0})}async function Bqe(e,r){if(X()&&r!==void 0&&Mr(e)){await n(r,c(e));return}await i(a(Ro(e),"tmp"),{recursive:!0})}function c(e){return{namespace:"job",jobId:e,relPath:["tmp"]}}async function n(e,r){let o=await e.ensureScope(r);if(!o.ok){let t=Ym(o.error);throw Object.assign(new C(`job folder not made (${Dt(o.error)})`,"job folder not made"),t!==void 0?{code:t}:{})}}
export{BYs,Bqe};
