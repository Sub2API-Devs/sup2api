
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Rr}from"./chunk-3g8vhh6f.js";import{C}from"./chunk-2g090z7k.js";import{ho}from"./chunk-y162pn60.js";import{lg,Rt}from"./chunk-2tgyb8s4.js";import{Y}from"./chunk-byeye1yp.js";import{mkdir as i}from"fs/promises";import{join as a}from"path";async function AMs(e,r){if(Y()&&r!==void 0&&Rr(e)){await n(r,{namespace:"job",jobId:e});return}await i(ho(e),{recursive:!0})}async function oGe(e,r){if(Y()&&r!==void 0&&Rr(e)){await n(r,c(e));return}await i(a(ho(e),"tmp"),{recursive:!0})}function c(e){return{namespace:"job",jobId:e,relPath:["tmp"]}}async function n(e,r){let o=await e.ensureScope(r);if(!o.ok){let t=lg(o.error);throw Object.assign(new C(`job folder not made (${Rt(o.error)})`,"job folder not made"),t!==void 0?{code:t}:{})}}
export{AMs,oGe};
