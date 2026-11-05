
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Of}from"./chunk-0e3nf8ec.js";import{xe}from"./chunk-90nja2dk.js";import{qJe,Ven,Nho}from"./chunk-4j4pn0rx.js";import{tHe}from"./chunk-4f7javgj.js";import{hm}from"./chunk-ga8a8mhv.js";function $so(o,e,t,n){return Nho(o.matcherFor(e),t,n,hm(o)?qJe:Ven)}function Bi(o,e,t){let n=e&&tHe(o);return(t??xe().loadedModules).some((r)=>r.hooks(o)&&Of(r)&&(e===void 0||$so(r,o,e,n)))}
export{$so,Bi};
