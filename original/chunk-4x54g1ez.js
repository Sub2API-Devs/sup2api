
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{kf,SN}from"./chunk-9m4wzd68.js";import{Ec,abe,fse,DZ,LB}from"./chunk-e6aww6q8.js";function s(o,t){let c=kf(),e=Ec(o),n=DZ(e,t),a=LB(e,t),r=!(SN()&&!abe(e,t));return{enabled:c,effectiveWindow:n,threshold:a,enforced:r,source:fse(e,t)}}function zAs(o){let t;return{notify(c,e){let n=s(c,e);if(t!==void 0&&_mo(t,n))return;t=n,o(n)},reset(){t=void 0}}}function _mo(o,t){return o.enabled===t.enabled&&o.effectiveWindow===t.effectiveWindow&&o.threshold===t.threshold&&o.enforced===t.enforced&&o.source===t.source}
export{zAs,_mo};
