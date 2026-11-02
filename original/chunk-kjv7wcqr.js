
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Ro,le}from"./chunk-cgr0tezp.js";import{I$}from"./chunk-k176arn3.js";import{vo,mMe,CY,Ic}from"./chunk-9mf2agcn.js";import{Fb,Tj}from"./chunk-t0gq9gyw.js";import{Jt}from"./chunk-z7nt3zpj.js";import{randomBytes as f}from"crypto";import{constants as a}from"fs";import{mkdir as p,writeFile as w}from"fs/promises";import{basename as l,dirname as E,join as n}from"path";var _="tengu_mossy_knuth";async function Vtn(t,i,r,o){let e=Ic();if(!Jt(_,{safe:!0})){let m=o?n(e,o):e;await p(m,{recursive:!0,mode:448});let c=n(m,`${t}${Date.now()}${i}`);return await w(c,r),c}await p(e,{recursive:!0,mode:448}),CY(e);let s=n(Ro(le(),E(e)).resolvedPath,l(e),`${t}${f(8).toString("hex")}${i}`);return await Eyo(s,r),s}async function Eyo(t,i){let r=await Fb(t,[t],{leaf:"replace"});try{await r.recheckBeforeWrite(),await I$(r.ioPath),await w(r.ioPath,i,{mode:384,flag:a.O_WRONLY|a.O_CREAT|a.O_EXCL|vo|mMe})}catch(o){Tj(o,r,t)}finally{await r.close()}}
export{Vtn,Eyo};
