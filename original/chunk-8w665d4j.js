
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{W8}from"./chunk-bbtre4r8.js";import{jhr}from"./chunk-qg0af0yq.js";import{EXt}from"./chunk-p5akk6be.js";import{iIt,$oo}from"./chunk-e7z1g8a9.js";import{PEe}from"./chunk-aepeg2w5.js";var d=new RegExp(`^<${W8}[ \\t>]`),S=`</${W8}>`,C=["",`
`],I=/\sfrom-plugin\s*(?:=\s*(?:"[^"<>]*"|'[^'<>]*'|[^\s>]*))?/gi,A=/from-plugin/i;function uq(e,n){if(typeof e==="string")return h(e,n===PEe);if(!Array.isArray(e))return e;let t=e;for(let o of C){let s=[],l=[],r="";t.forEach((i,p)=>{if(i.type==="text"){if(l.length>0)r+=o;s.push(r.length),l.push(p),r+=i.text}});let a=$oo(r);if(a.length===0)continue;let g=t.slice(),u=0;l.forEach((i,p)=>{let c=g[i],P=s[p],_=s[p+1]??1/0;if(c.type!=="text")return;let f=[],E=0;for(;u<a.length&&a[u]<_;u++){let m=a[u]-P;f.push(c.text.slice(E,m),"<\\"),E=m+EXt(c.text,m)}if(f.length>0)f.push(c.text.slice(E)),g[i]={...c,text:f.join("")}}),t=g}return t}function IKs(e){return h(e,!0)}function h(e,n){let t=e.trimEnd(),o=t.length-S.length,s=jhr.test(e);if(!(o>0&&t.endsWith(S)&&(s||n&&d.test(e))))return iIt(e);let r=B(e.slice(1,o));return A.test(O(r))?iIt(e):`<${iIt(r)}${e.slice(o)}`}function B(e){let n=O(e);return n.replace(I,"")+e.slice(n.length)}function O(e){let n=e.indexOf(">");return n<0?e:e.slice(0,n)}
export{uq,IKs};
