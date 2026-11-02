
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{c}from"./chunk-0wqny7vr.js";import{a,ii}from"./chunk-8kte1b36.js";import{WO,Nx}from"./chunk-1rckdhfn.js";import{Cle}from"./chunk-4eww0w8n.js";var n="tengu_org_policy_denied";function r(i,o){let e=Nx(i);if(e===null||e==="unregistered")return null;return{org_policy_key:c(i),org_policy_deny_kind:c(e),org_policy_taint_named:Cle(WO()).length>0,surface:c(o)}}function GP(i,o){let e=r(i,o);if(e)a(n,e)}async function p1(i,o){let e=r(i,o);if(e)await ii(n,e)}
export{GP,p1};
