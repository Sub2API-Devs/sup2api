
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{No,le}from"./chunk-6hadbefe.js";import{Xr,gie,fU}from"./chunk-n44f9pt7.js";import{lJ,Eu}from"./chunk-p126a53v.js";import{HS,gG}from"./chunk-85eyj5gy.js";import{Ct}from"./chunk-b2c956ye.js";import{randomBytes as f}from"crypto";import{constants as a}from"fs";import{mkdir as p,writeFile as w}from"fs/promises";import{basename as l,dirname as E,join as n}from"path";var _="tengu_mossy_knuth";async function $cn(t,i,r,o){let e=Eu();if(!Ct(_,{safe:!0})){let m=o?n(e,o):e;await p(m,{recursive:!0,mode:448});let c=n(m,`${t}${Date.now()}${i}`);return await w(c,r),c}await p(e,{recursive:!0,mode:448}),lJ(e);let s=n(No(le(),E(e)).resolvedPath,l(e),`${t}${f(8).toString("hex")}${i}`);return await EOo(s,r),s}async function EOo(t,i){let r=await HS(t,[t],{leaf:"replace"});try{await r.recheckBeforeWrite(),await fU(r.ioPath),await w(r.ioPath,i,{mode:384,flag:a.O_WRONLY|a.O_CREAT|a.O_EXCL|Xr|gie})}catch(o){gG(o,r,t)}finally{await r.close()}}
export{$cn,EOo};
