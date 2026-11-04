
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{$t}from"./chunk-m41h77x8.js";import{bp}from"./chunk-cgr0tezp.js";import{gut}from"./chunk-t0gq9gyw.js";import{l8}from"./chunk-e7z1g8a9.js";var gp="MEMORY.md",FH=200,ZJ=25000,tto=4*ZJ,DUe=200,Qme=4096;function LUe(t){let r=t.trim();return{trimmed:r,lineCount:$t(r,`
`)+1,byteCount:r.length}}function UH(t){return t.normalize("NFC").toLowerCase()}function L4(t){let r=t?.lastIndexOf("/")??-1;if(r<=0)return"";let n=t.slice(0,r+1);return n.split("/").some((e)=>e.startsWith("."))?"":n}var t6e="This directory already exists \u2014 write to it directly with the Write tool (do not run mkdir or check for its existence).",nto="Both directories already exist \u2014 write to them directly with the Write tool (do not run mkdir or check for their existence).";function K1(t){let r="";for(let n of gut(bp(t.replace(/\r\n?|[\u2028\u2029]/g,`
`)))){let e=n.codePointAt(0),o=e!==9&&e!==10&&(e<32||e>=127&&e<=159);r+=o?"\uFFFD":n}return r}function Fae(t){return l8(s(t))}function mpr(t){return bxt(t)||/[\p{Cc}\u2028\u2029]/u.test(t)}function pCn(t){return Fae(t.replace(/[\t\n\r\u2028\u2029]/g,""))}var xos=new Set([8204,8205,65038,65039]),i=/^[\p{Cf}\p{Co}\p{Cn}\p{Cs}\p{DI}]$/u;function bxt(t){let r=t.codePointAt(0);if(xos.has(r)||r===9||r===10||r===13)return!1;return i.test(t)||r<32||r>=127&&r<=159}function s(t){let r="";for(let n of t.replace(/\r\n?|[\u2028\u2029]/g,`
`)){if(bxt(n))continue;r+=n}return r}
export{gp,FH,ZJ,tto,DUe,Qme,LUe,UH,L4,t6e,nto,K1,Fae,mpr,pCn,xos,bxt};
