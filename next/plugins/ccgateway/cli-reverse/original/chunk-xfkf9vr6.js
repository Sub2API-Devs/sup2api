
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{p}from"./chunk-kpa9nk58.js";import{o,u,Ue,T}from"./chunk-7vp249v4.js";var r=p(()=>Ue([u({v:T(1),state:o()}),u({v:T(2),engine:T("bridge")})]));function jTs(e,n){if(e===void 0||e===null)return typeof n==="object"&&n!==null?"none":"unstated";let t=r().safeParse(e);if(!t.success)return"unreadable";if(t.data.v===2)return"bridge";switch(t.data.state){case"connected":case"requested":case"detached":return t.data.state;default:return"other_state"}}function Nke(e){return e==="none"||e==="bridge"||e==="this_helper"}
export{jTs,Nke};
