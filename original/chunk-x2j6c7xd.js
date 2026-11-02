
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Sd}from"./chunk-8pssrarc.js";import{Tkt}from"./chunk-x1mwqya5.js";import{P,R,j}from"./chunk-p86mcgbc.js";j();function mi(n,e,t){let r=Sd(),i=r?.getDisplayText(n,e),o=i===void 0,s=r?"action_not_found":"no_context",u=R(!1);if(P(()=>{if(o&&!u.current)u.current=!0,Tkt(n,e,t,s)},[o,n,e,t,s]),o)return t;return i===null?"":i}
export{mi};
