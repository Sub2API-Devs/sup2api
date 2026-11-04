
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Sd}from"./chunk-8pssrarc.js";import{WF,Dbn,Tkt}from"./chunk-x1mwqya5.js";import{P,R,j}from"./chunk-p86mcgbc.js";j();function Wi(e,i,t){let o=Sd(),n=o?Dbn(e,i,o.bindings):void 0,r=n===void 0,f=o?"action_not_found":"no_context",d=R(!1);if(P(()=>{if(r&&!d.current)d.current=!0,Tkt(e,i,t,f)},[r,e,i,t,f]),n===void 0)return t;return n===null?"":WF(n)}
export{Wi};
