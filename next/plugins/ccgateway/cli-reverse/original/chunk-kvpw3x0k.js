
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{w}from"./chunk-s89ma3n1.js";import{nt,s,Ja}from"./chunk-x6v6jz2y.js";import{dTe}from"./chunk-07xmkrj2.js";import{ap}from"./chunk-9rmf152v.js";import{e}from"./chunk-nn4p932b.js";var t=150;function o0t(M){let p=w(8),{tone:n,text:i}=M,T=ap(),N=nt(),o=T||N,[c,P]=Ja(o?null:t);const f=Math.floor(P/t);let r;if(p[0]!==o||p[1]!==f||p[2]!==i||p[3]!==n)r=e(dTe,{state:"live",tone:n,text:i,linkify:!1,frame:f,reducedMotion:o}),p[0]=o,p[1]=f,p[2]=i,p[3]=n,p[4]=r;else r=p[4];let m;if(p[5]!==c||p[6]!==r)m=e(s,{ref:c,flexDirection:"column",children:r}),p[5]=c,p[6]=r,p[7]=m;else m=p[7];return m}var lTe=0;
export{o0t,lTe};
