
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{S}from"./chunk-zt8d60ng.js";import{rt,s,ll}from"./chunk-emhzq435.js";import{wxe}from"./chunk-9f7pg4vv.js";import{np}from"./chunk-6ax44zw6.js";import{e}from"./chunk-6n4z8qxn.js";var t=150;function Ljt(M){let p=S(8),{tone:n,text:i}=M,T=np(),N=rt(),o=T||N,[c,P]=ll(o?null:t);const f=Math.floor(P/t);let r;if(p[0]!==o||p[1]!==f||p[2]!==i||p[3]!==n)r=e(wxe,{state:"live",tone:n,text:i,linkify:!1,frame:f,reducedMotion:o}),p[0]=o,p[1]=f,p[2]=i,p[3]=n,p[4]=r;else r=p[4];let m;if(p[5]!==c||p[6]!==r)m=e(s,{ref:c,flexDirection:"column",children:r}),p[5]=c,p[6]=r,p[7]=m;else m=p[7];return m}var Sxe=0;
export{Ljt,Sxe};
