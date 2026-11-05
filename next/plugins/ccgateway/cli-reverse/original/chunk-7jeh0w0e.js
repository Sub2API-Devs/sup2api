
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Lt}from"./chunk-8824h7w7.js";import{rm}from"./chunk-2jb250pa.js";import{Zyt}from"./chunk-85eyj5gy.js";import{xX}from"./chunk-p21mddyh.js";var Yp="MEMORY.md",cN=200,BZ=25000,Who=4*BZ,FGe=200,A_e=4096;function UGe(t){let r=t.trim();return{trimmed:r,lineCount:Lt(r,`
`)+1,byteCount:r.length}}function uN(t){return t.normalize("NFC").toLowerCase()}function O5(t){let r=t?.lastIndexOf("/")??-1;if(r<=0)return"";let n=t.slice(0,r+1);return n.split("/").some((e)=>e.startsWith("."))?"":n}var XJe="This directory already exists \u2014 write to it directly with the Write tool (do not run mkdir or check for its existence).",Gho="Both directories already exist \u2014 write to them directly with the Write tool (do not run mkdir or check for their existence).";function BW(t){let r="";for(let n of Zyt(rm(t.replace(/\r\n?|[\u2028\u2029]/g,`
`)))){let e=n.codePointAt(0),o=e!==9&&e!==10&&(e<32||e>=127&&e<=159);r+=o?"\uFFFD":n}return r}function oue(t){return xX(s(t))}function jTr(t){return GHt(t)||/[\p{Cc}\u2028\u2029]/u.test(t)}function Z0n(t){return oue(t.replace(/[\t\n\r\u2028\u2029]/g,""))}var IEs=new Set([8204,8205,65038,65039]),i=/^[\p{Cf}\p{Co}\p{Cn}\p{Cs}\p{DI}]$/u;function GHt(t){let r=t.codePointAt(0);if(IEs.has(r)||r===9||r===10||r===13)return!1;return i.test(t)||r<32||r>=127&&r<=159}function s(t){let r="";for(let n of t.replace(/\r\n?|[\u2028\u2029]/g,`
`)){if(GHt(n))continue;r+=n}return r}
export{Yp,cN,BZ,Who,FGe,A_e,UGe,uN,O5,XJe,Gho,BW,oue,jTr,Z0n,IEs,GHt};
