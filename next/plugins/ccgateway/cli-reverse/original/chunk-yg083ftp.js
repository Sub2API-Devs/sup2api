
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{d}from"./chunk-63094ahz.js";import{_rn}from"./chunk-bjjd0r91.js";import{B2,Pbe}from"./chunk-j0ryhdyy.js";import{Sr}from"./chunk-gehzbwn8.js";var JHo={};Sr(JHo,{default:()=>JHo,endsInARowOf:()=>gXi,unsettledBy:()=>N1r,workerEndingOf:()=>yXi});function gXi(e){let n=Number(e);return Number.isSafeInteger(n)&&n>0?n:0}var N1r=(e)=>({reason:`Error: ${d(e)}`,kind:e instanceof _rn?"passing":"lasting"});var o=5,m=`It did not pass in ${o} tries`,p="it is held for good, or refused to this process",t="Start the daemon again once this is mended.",a=`${m}: ${p}. ${t}`;function yXi(e,n){let r=e.kind==="passing",s=r&&n+1<o,i=r?a:t;return s?{code:Pbe,said:`${e.reason}
`}:{code:B2,said:`${e.reason}
${i}
`}}export{gXi,N1r,yXi,JHo};
