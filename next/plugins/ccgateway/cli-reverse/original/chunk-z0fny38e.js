
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Rn}from"./chunk-za46rn2f.js";import{ND,wC,GE,ww}from"./chunk-80bdkzt1.js";import{ze}from"./chunk-5qsfbz2c.js";import{Sg,Rvo}from"./chunk-85eyj5gy.js";import{cP}from"./chunk-0yn8vxcn.js";import{dirname as v,join as a}from"path";import{realpath as f}from"fs";import{promisify as m}from"util";var h=m(f.native);function c(e){return/^[A-Za-z0-9_-]{1,128}$/.test(e)?e:ND(e)||"empty-id"}async function d(e,t,{isRootResolved:n=!1}={}){return n?Rn(e):ww(e,cP(t))}async function YXs(e,t,n,i){return a(GE(await d(e,n,i)),tzr(t))}async function XXs(e,t,n,i){let o=await d(e,n,i),p=a(GE(o),tzr(t)),r=wC(o),s=n===void 0?void 0:iBo(r,t);return{path:p,projectKey:r,v5:n===void 0||s===void 0?void 0:{backend:n,key:s}}}function iBo(e,t){let n=ze.dirSyncRecord(e,c(t));return Sg(n)===void 0?n:void 0}function tzr(e){return`${c(e)}${Rvo}`}
export{YXs,XXs,iBo,tzr};
