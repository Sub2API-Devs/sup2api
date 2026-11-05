
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{f}from"./chunk-vwtpw18x.js";import{l,li}from"./chunk-nkv493nm.js";import{TD,eI}from"./chunk-f3md3zsc.js";import{Jue}from"./chunk-rn8k2fjf.js";var n="tengu_org_policy_denied";function r(i,o){let e=eI(i);if(e===null||e==="unregistered")return null;return{org_policy_key:f(i),org_policy_deny_kind:f(e),org_policy_taint_named:Jue(TD()).length>0,surface:f(o)}}function dO(i,o){let e=r(i,o);if(e)l(n,e)}async function W0(i,o){let e=r(i,o);if(e)await li(n,e)}
export{dO,W0};
