
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Mn}from"./chunk-aat7wt0p.js";import{b0,fA,Vw,TS}from"./chunk-f9pzpnqt.js";import{je}from"./chunk-3g8vhh6f.js";import{Ig,klo}from"./chunk-t0gq9gyw.js";import{ex}from"./chunk-x753sk9t.js";import{dirname as v,join as a}from"path";import{realpath as f}from"fs";import{promisify as m}from"util";var h=m(f.native);function c(e){return/^[A-Za-z0-9_-]{1,128}$/.test(e)?e:b0(e)||"empty-id"}async function d(e,t,{isRootResolved:n=!1}={}){return n?Mn(e):TS(e,ex(t))}async function C$s(e,t,n,i){return a(Vw(await d(e,n,i)),CMr(t))}async function R$s(e,t,n,i){let o=await d(e,n,i),p=a(Vw(o),CMr(t)),r=fA(o),s=n===void 0?void 0:kAo(r,t);return{path:p,projectKey:r,v5:n===void 0||s===void 0?void 0:{backend:n,key:s}}}function kAo(e,t){let n=je.dirSyncRecord(e,c(t));return Ig(n)===void 0?n:void 0}function CMr(e){return`${c(e)}${klo}`}
export{C$s,R$s,kAo,CMr};
