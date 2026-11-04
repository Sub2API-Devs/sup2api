
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Kt}from"./chunk-5hsd6qen.js";import{be}from"./chunk-q8cqcff6.js";import{ow,MTn,k3}from"./chunk-q4qb1h08.js";function i(){return c(k3(MTn(),"globalConfig"),Kt("userSettings")?k3(be("userSettings")?.env,"userSettings"):{},k3(be("flagSettings")?.env,"flagSettings"),k3(be("policySettings")?.env,"policySettings"))}function cte(){return g(ow(),i())}function g(s,n){let r=new Set(Object.keys(n).map((e)=>e.toUpperCase())),t={...s};for(let e of Object.keys(t))if(!(e in n)&&r.has(e.toUpperCase()))delete t[e];return Object.assign(t,n)}function c(...s){let n=new Map;for(let t of s)for(let[e,o]of Object.entries(t))n.set(e.toUpperCase(),{key:e,value:o});let r={};for(let{key:t,value:e}of n.values())r[t]=e;return r}
export{cte};
