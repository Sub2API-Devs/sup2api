
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{E_r}from"./chunk-pzf4a1kg.js";import{Ufr,Bfr}from"./chunk-7jxyna5q.js";import{Ki}from"./chunk-7kayq7nc.js";var u=30000;function m1t(e){let n=typeof e==="string"?Ki(e):"";if(!n||E_r(n)||n===Ufr||n===Bfr)return;return n}function fxo(e,n,r,a){let i=new AbortController,s,d=(t)=>{if(i.signal.aborted||t===void 0||t===s)return;s=t,a(t)};if(n?.then(d,()=>{}),r===void 0)return()=>i.abort();let o=()=>{},f=()=>{r(i.signal).then(d,()=>{}).finally(()=>{if(!i.signal.aborted)o=e.setTimeout(f,u)})};return o=e.setTimeout(f,u),()=>{i.abort(),o()}}
export{m1t,fxo};
