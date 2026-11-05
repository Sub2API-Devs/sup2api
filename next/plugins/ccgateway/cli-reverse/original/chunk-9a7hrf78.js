
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Ce}from"./chunk-9n68jj1e.js";import{_,ee}from"./chunk-6hadbefe.js";import{VMo}from"./chunk-2avr6cej.js";import{Br}from"./chunk-t1ad9vmv.js";import{S}from"./chunk-zt8d60ng.js";import{n,js}from"./chunk-emhzq435.js";import{Ve}from"./chunk-h40h7b8f.js";import{aj}from"./chunk-xz2j9584.js";import{e}from"./chunk-6n4z8qxn.js";import{uS}from"./chunk-csd7xx5z.js";import{gts}from"./chunk-81c4jqdt.js";import{Qt,Ee,Q,j}from"./chunk-zsz062c7.js";j();j();j();var l=Qt(!1);function oFr(t){let s=S(2),{children:r}=t,o;if(s[0]!==r)o=e(l.Provider,{value:!0,children:r}),s[0]=r,s[1]=o;else o=s[1];return o}function u(){return Ee(l)}function M(t){try{let r=ee(t),s=_(r),o=t.replaceAll("\\/","/").replace(/\s+/g,""),m=s.replace(/\s+/g,"");if(o!==m)return t;return _(r,null,2)}catch{return t}}var P=1e4;function x(t){if(t.length>P)return t;return t.split(`
`).map(M).join(`
`)}var A=/https?:\/\/[^\s"'<>\\\x00-\x1f]+/g,C=1e5;function sFr(t,r){if(t.length>C)return t;let s=(o)=>o.replace(A,(m)=>uS(m,void 0,{themeName:r}));if(!t.includes(VMo))return s(t);return t.split(`
`).map((o)=>o.includes(VMo)?o:s(o)).join(`
`)}function tL(t){let c=S(14),{content:r,verbose:s,isError:o}=t,{columns:m}=Ce(),[d]=Br(),k=u(),g=Ee(aj),z=s||k,O;if(c[0]!==r||c[1]!==d)O=sFr(x(r),d),c[0]=r,c[1]=d,c[2]=O;else O=c[2];let a=O,h;ct:{if(z){let i;if(c[3]!==a)i=f(a),c[3]=a,c[4]=i;else i=c[4];h=i;break ct}let i;if(c[5]!==m||c[6]!==a||c[7]!==g)i=f(gts(a,m,g)),c[5]=m,c[6]=a,c[7]=g,c[8]=i;else i=c[8];h=i}let N=h,R=o?"error":void 0,i;if(c[9]!==N)i=e(js,{children:N}),c[9]=N,c[10]=i;else i=c[10];let v;if(c[11]!==R||c[12]!==i)v=e(Ve,{children:e(n,{color:R,children:i})}),c[11]=R,c[12]=i,c[13]=v;else v=c[13];return v}function f(t){return t.replace(/\u001b\[([0-9]+;)*4(;[0-9]+)*m|\u001b\[4(;[0-9]+)*m|\u001b\[([0-9]+;)*4m/g,"")}
export{oFr,sFr,tL};
