
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Xsr}from"./chunk-2ny09dd0.js";import{Xer,Jer}from"./chunk-s61vbvea.js";import{Xi}from"./chunk-bwbq4xvm.js";var f=30000;function Gpo(i){let n=Xi(i??"");if(!n||Xsr(n)||n===Xer||n===Jer)return;return n}function zpo(i,n,r,a){let e=new AbortController,s,d=(t)=>{if(e.signal.aborted||t===void 0||t===s)return;s=t,a(t)};if(n?.then(d,()=>{}),r===void 0)return()=>e.abort();let o=()=>{},u=()=>{r(e.signal).then(d,()=>{}).finally(()=>{if(!e.signal.aborted)o=i.setTimeout(u,f)})};return o=i.setTimeout(u,f),()=>{e.abort(),o()}}
export{Gpo,zpo};
