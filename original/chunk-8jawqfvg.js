
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{n}from"./chunk-x6v6jz2y.js";import{w}from"./chunk-s89ma3n1.js";import{Is}from"./chunk-1kwgxcw6.js";import{e}from"./chunk-nn4p932b.js";function rP(s){let b=w(3),{children:u,exitActive:o,onInterrupt:x,italic:r}=s,R=o===void 0?!0:o,t=r===void 0?!1:r,{pending:y,keyName:N}=Is(void 0,x,R);const i=y?`Press ${N} again to exit`:u;let a;if(b[0]!==t||b[1]!==i)a=e(n,{dimColor:!0,italic:t,children:i}),b[0]=t,b[1]=i,b[2]=a;else a=b[2];return a}
export{rP};
