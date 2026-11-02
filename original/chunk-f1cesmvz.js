
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{w}from"./chunk-s89ma3n1.js";import{UJt,rde}from"./chunk-640x3zn9.js";import{n,Zt}from"./chunk-x6v6jz2y.js";import{e}from"./chunk-nn4p932b.js";function LV(H){let y=w(10),{children:r,color:u,bold:m,linkHref:a}=H,o;if(y[0]!==r||y[1]!==a){o=[];let l=0;for(const i of r.matchAll(UJt)){let x=rde(i[0]);let k=a===void 0?x:a(x);if(k===void 0){continue}if(i.index>l)o.push(r.slice(l,i.index));o.push(e(Zt,{url:k,children:k},i.index)),l=i.index+x.length}let s;if(y[3]!==r||y[4]!==l)s=r.slice(l),y[3]=r,y[4]=l,y[5]=s;else s=y[5];o.push(s);y[0]=r,y[1]=a,y[2]=o}else o=y[2];let s;if(y[6]!==m||y[7]!==u||y[8]!==o)s=e(n,{color:u,bold:m,children:o}),y[6]=m,y[7]=u,y[8]=o,y[9]=s;else s=y[9];return s}
export{LV};
