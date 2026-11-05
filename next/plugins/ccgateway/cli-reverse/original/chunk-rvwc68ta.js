
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{p}from"./chunk-k6qypy1d.js";import{o,u,Be,T}from"./chunk-m4y44r15.js";var r=p(()=>Be([u({v:T(1),state:o()}),u({v:T(2),engine:T("bridge")})]));function Jjs(e,n){if(e===void 0||e===null)return typeof n==="object"&&n!==null?"none":"unstated";let t=r().safeParse(e);if(!t.success)return"unreadable";if(t.data.v===2)return"bridge";switch(t.data.state){case"connected":case"requested":case"detached":return t.data.state;default:return"other_state"}}function GRe(e){return e==="none"||e==="bridge"||e==="this_helper"}
export{Jjs,GRe};
