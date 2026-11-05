
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{nr,Vg}from"./chunk-za46rn2f.js";import{G6}from"./chunk-8824h7w7.js";import{posix as a}from"path";var fvr=String.raw`\s\u2800\uFFF9-\uFFFB\p{Cc}\p{M}\p{Default_Ignorable_Code_Point}`,c=new RegExp(`^[${fvr}]+`,"u");function F_s(n){return n.replace(c,"")}function wfo(n,r=B_s(n)){return nr(n)||ALt(n)||G6.test(r[0])||r.map(F_s).some((e)=>nr(e)||ALt(e))}var u=/^\.\.\//;function ALt(n){return Vg(n)||Vg(a.normalize(n).replace(u,"/"))||l(n)&&Vg("/"+n)}function l(n){let r=a.normalize(n);return r===".."||r.startsWith("../")}function U_s(n){let r=n.slice(7);return wfo(r)||wfo(r.slice(1))}var i=/(?:%[0-9A-Fa-f]{2}){1,512}/g,f=/^%[0-9A-Fa-f]{2}/;function B_s(n){if(!n.includes("%"))return[n,n];let r=new TextDecoder("utf-8",{fatal:!1,ignoreBOM:!0});return[n.replace(i,(e,t)=>{let o=t+e.length;return r.decode(s(e),{stream:f.test(n.slice(o,o+3))})}),n.replace(i,(e)=>Array.from(s(e),(t)=>String.fromCharCode(t)).join(""))]}function s(n){return Uint8Array.from(n.slice(1).split("%"),(r)=>parseInt(r,16))}
export{fvr,F_s,wfo,ALt,U_s,B_s};
