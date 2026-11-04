
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{d}from"./chunk-2g090z7k.js";import{N9t}from"./chunk-1mnz7yj6.js";import{jG,the}from"./chunk-a2g5s7cw.js";import{Ar}from"./chunk-rshven70.js";var Kwo={};Ar(Kwo,{default:()=>Kwo,endsInARowOf:()=>OHi,unsettledBy:()=>PPr,workerEndingOf:()=>MHi});function OHi(e){let n=Number(e);return Number.isSafeInteger(n)&&n>0?n:0}var PPr=(e)=>({reason:`Error: ${d(e)}`,kind:e instanceof N9t?"passing":"lasting"});var o=5,m=`It did not pass in ${o} tries`,p="it is held for good, or refused to this process",t="Start the daemon again once this is mended.",a=`${m}: ${p}. ${t}`;function MHi(e,n){let r=e.kind==="passing",s=r&&n+1<o,i=r?a:t;return s?{code:the,said:`${e.reason}
`}:{code:jG,said:`${e.reason}
${i}
`}}export{OHi,PPr,MHi,Kwo};
