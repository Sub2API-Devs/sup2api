
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{bJ}from"./chunk-my2r02mp.js";import{Ixr}from"./chunk-gb7aq6sf.js";import{don}from"./chunk-72da5r6r.js";import{xNt,Nbo}from"./chunk-p21mddyh.js";import{wAe}from"./chunk-exfmq47h.js";var d=new RegExp(`^<${bJ}[ \\t>]`),S=`</${bJ}>`,C=["",`
`],I=/\sfrom-plugin\s*(?:=\s*(?:"[^"<>]*"|'[^'<>]*'|[^\s>]*))?/gi,A=/from-plugin/i;function dY(e,n){if(typeof e==="string")return h(e,n===wAe);if(!Array.isArray(e))return e;let t=e;for(let o of C){let s=[],l=[],r="";t.forEach((i,p)=>{if(i.type==="text"){if(l.length>0)r+=o;s.push(r.length),l.push(p),r+=i.text}});let a=Nbo(r);if(a.length===0)continue;let g=t.slice(),u=0;l.forEach((i,p)=>{let c=g[i],P=s[p],_=s[p+1]??1/0;if(c.type!=="text")return;let f=[],E=0;for(;u<a.length&&a[u]<_;u++){let m=a[u]-P;f.push(c.text.slice(E,m),"<\\"),E=m+don(c.text,m)}if(f.length>0)f.push(c.text.slice(E)),g[i]={...c,text:f.join("")}}),t=g}return t}function nii(e){return h(e,!0)}function h(e,n){let t=e.trimEnd(),o=t.length-S.length,s=Ixr.test(e);if(!(o>0&&t.endsWith(S)&&(s||n&&d.test(e))))return xNt(e);let r=B(e.slice(1,o));return A.test(O(r))?xNt(e):`<${xNt(r)}${e.slice(o)}`}function B(e){let n=O(e);return n.replace(I,"")+e.slice(n.length)}function O(e){let n=e.indexOf(">");return n<0?e:e.slice(0,n)}
export{dY,nii};
