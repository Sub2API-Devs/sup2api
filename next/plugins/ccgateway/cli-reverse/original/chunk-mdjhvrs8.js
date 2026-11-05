
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{qt}from"./chunk-sq9ffh11.js";import{Se}from"./chunk-5fn9rb8r.js";import{Lg,YLn,j9}from"./chunk-71parphm.js";function i(){return c(j9(YLn(),"globalConfig"),qt("userSettings")?j9(Se("userSettings")?.env,"userSettings"):{},j9(Se("flagSettings")?.env,"flagSettings"),j9(Se("policySettings")?.env,"policySettings"))}function g9(){return g(Lg(),i())}function g(s,n){let r=new Set(Object.keys(n).map((e)=>e.toUpperCase())),t={...s};for(let e of Object.keys(t))if(!(e in n)&&r.has(e.toUpperCase()))delete t[e];return Object.assign(t,n)}function c(...s){let n=new Map;for(let t of s)for(let[e,o]of Object.entries(t))n.set(e.toUpperCase(),{key:e,value:o});let r={};for(let{key:t,value:e}of n.values())r[t]=e;return r}
export{g9};
