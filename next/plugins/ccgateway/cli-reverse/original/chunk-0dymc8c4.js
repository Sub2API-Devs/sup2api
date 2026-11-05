
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Qu,zk}from"./chunk-exfmq47h.js";import{Mw}from"./chunk-5xgkngpb.js";function o(e){let t=Qu(e);return t===Qu("")?"(unnamed agent)":t}function r(e,t,i){return`${o(e)} agent: ${zk(t,i)}`}function s(e,t,i){return{type:"notification",notification:{key:`agent-model-restricted-${o(e)}-${Qu(t)}`,text:r(e,t,i),priority:"medium",color:"warning",timeoutMs:1e4}}}function cXn(e,t){return(i,n)=>{t?.(s(e,i,n))}}function HFe(e,t){return(i,n)=>{t?.(Mw(r(e,i,n),"warning"))}}
export{cXn,HFe};
