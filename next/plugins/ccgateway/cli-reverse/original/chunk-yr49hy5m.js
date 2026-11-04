
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Qn,Qg}from"./chunk-aat7wt0p.js";import{FY}from"./chunk-m41h77x8.js";import{posix as a}from"path";var Mcr=String.raw`\s\u2800\uFFF9-\uFFFB\p{Cc}\p{M}\p{Default_Ignorable_Code_Point}`,c=new RegExp(`^[${Mcr}]+`,"u");function Ees(n){return n.replace(c,"")}function CQr(n,r=kes(n)){return Qn(n)||sRt(n)||FY.test(r[0])||r.map(Ees).some((e)=>Qn(e)||sRt(e))}var u=/^\.\.\//;function sRt(n){return Qg(n)||Qg(a.normalize(n).replace(u,"/"))||l(n)&&Qg("/"+n)}function l(n){let r=a.normalize(n);return r===".."||r.startsWith("../")}function ves(n){let r=n.slice(7);return CQr(r)||CQr(r.slice(1))}var i=/(?:%[0-9A-Fa-f]{2}){1,512}/g,f=/^%[0-9A-Fa-f]{2}/;function kes(n){if(!n.includes("%"))return[n,n];let r=new TextDecoder("utf-8",{fatal:!1,ignoreBOM:!0});return[n.replace(i,(e,t)=>{let o=t+e.length;return r.decode(s(e),{stream:f.test(n.slice(o,o+3))})}),n.replace(i,(e)=>Array.from(s(e),(t)=>String.fromCharCode(t)).join(""))]}function s(n){return Uint8Array.from(n.slice(1).split("%"),(r)=>parseInt(r,16))}
export{Mcr,Ees,CQr,sRt,ves,kes};
