
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{tp,pv}from"./chunk-aepeg2w5.js";import{Lv}from"./chunk-e6aww6q8.js";function o(e){let t=tp(e);return t===tp("")?"(unnamed agent)":t}function r(e,t,i){return`${o(e)} agent: ${pv(t,i)}`}function s(e,t,i){return{type:"notification",notification:{key:`agent-model-restricted-${o(e)}-${tp(t)}`,text:r(e,t,i),priority:"medium",color:"warning",timeoutMs:1e4}}}function i2n(e,t){return(i,n)=>{t?.(s(e,i,n))}}function GLe(e,t){return(i,n)=>{t?.(Lv(r(e,i,n),"warning"))}}
export{i2n,GLe};
