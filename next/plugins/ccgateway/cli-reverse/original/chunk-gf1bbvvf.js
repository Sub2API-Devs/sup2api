
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Nu,J$}from"./chunk-za6ana42.js";import{tc,DEe,ple,Rne,SM}from"./chunk-5xgkngpb.js";function s(o,t){let c=Nu(),e=tc(o),n=Rne(e,t),a=SM(e,t),r=!(J$()&&!DEe(e,t));return{enabled:c,effectiveWindow:n,threshold:a,enforced:r,source:ple(e,t)}}function ZWs(o){let t;return{notify(c,e){let n=s(c,e);if(t!==void 0&&uxo(t,n))return;t=n,o(n)},reset(){t=void 0}}}function uxo(o,t){return o.enabled===t.enabled&&o.effectiveWindow===t.effectiveWindow&&o.threshold===t.threshold&&o.enforced===t.enforced&&o.source===t.source}
export{ZWs,uxo};
