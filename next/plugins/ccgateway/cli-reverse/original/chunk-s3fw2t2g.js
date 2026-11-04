
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Ae}from"./chunk-9ks6yv81.js";import{_,te}from"./chunk-cgr0tezp.js";import{z_o}from"./chunk-bzr73sfg.js";import{Nr}from"./chunk-v9w831vx.js";import{w}from"./chunk-s89ma3n1.js";import{n,Es}from"./chunk-x6v6jz2y.js";import{ze}from"./chunk-wq9366y3.js";import{d5}from"./chunk-g6fxv0zg.js";import{e}from"./chunk-nn4p932b.js";import{kw}from"./chunk-hnwnzznd.js";import{C2o}from"./chunk-bn7jsn5n.js";import{qt,Se,Q,j}from"./chunk-p86mcgbc.js";j();j();j();var c=qt(!1);function tCr(r){let s=w(2),{children:t}=r,o;if(s[0]!==t)o=e(c.Provider,{value:!0,children:t}),s[0]=t,s[1]=o;else o=s[1];return o}function u(){return Se(c)}function M(r){try{let t=te(r),s=_(t),o=r.replaceAll("\\/","/").replace(/\s+/g,""),m=s.replace(/\s+/g,"");if(o!==m)return r;return _(t,null,2)}catch{return r}}var P=1e4;function b(r){if(r.length>P)return r;return r.split(`
`).map(M).join(`
`)}var A=/https?:\/\/[^\s"'<>\\\x00-\x1f]+/g,C=1e5;function nCr(r,t){if(r.length>C)return r;let s=(o)=>o.replace(A,(m)=>kw(m,void 0,{themeName:t}));if(!r.includes(z_o))return s(r);return r.split(`
`).map((o)=>o.includes(z_o)?o:s(o)).join(`
`)}function fM(r){let l=w(14),{content:t,verbose:s,isError:o,isWarning:m}=r,{columns:d}=Ae(),[g]=Nr(),z=u(),h=Se(d5),G=s||z,O;if(l[0]!==t||l[1]!==g)O=nCr(b(t),g),l[0]=t,l[1]=g,l[2]=O;else O=l[2];let a=O,N;ur:{if(G){let i;if(l[3]!==a)i=f(a),l[3]=a,l[4]=i;else i=l[4];N=i;break ur}let i;if(l[5]!==d||l[6]!==a||l[7]!==h)i=f(C2o(a,d,h)),l[5]=d,l[6]=a,l[7]=h,l[8]=i;else i=l[8];N=i}let R=N,x=o?"error":m?"warning":void 0,i;if(l[9]!==R)i=e(Es,{children:R}),l[9]=R,l[10]=i;else i=l[10];let v;if(l[11]!==x||l[12]!==i)v=e(ze,{children:e(n,{color:x,children:i})}),l[11]=x,l[12]=i,l[13]=v;else v=l[13];return v}function f(r){return r.replace(/\u001b\[([0-9]+;)*4(;[0-9]+)*m|\u001b\[4(;[0-9]+)*m|\u001b\[([0-9]+;)*4m/g,"")}
export{tCr,nCr,fM};
