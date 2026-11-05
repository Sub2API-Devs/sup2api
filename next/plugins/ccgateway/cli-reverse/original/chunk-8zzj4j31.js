
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{fte}from"./chunk-ndkzc8d3.js";function fN(t,e){return(r)=>t((S)=>c(S,e,S[e],r(S[e])))}function rNn(t){return(e)=>t((r)=>{let S=e(r);return Object.is(S,r)?r:{...r,...S}})}function QTr(t){return{getSnapshot:t.getSnapshot,getState:t.getState,setState:rNn(t.setState),subscribe:t.subscribe}}function oHe(t,e,r){return{get:()=>t()[r],set:fN(e,r)}}function _mt(t,e){return(r,S)=>({get:()=>r()[t]??e,set:(a)=>S((s)=>{let n=s[t]??e;return c(s,t,n,a(n))})})}function XBi(t){let e=t;return{get:()=>e,set:(r)=>{e=r(e)}}}function Ds(t,e){let r=t,S=new Set,a=e&&fte(e),s=()=>r;return{getSnapshot:s,getState:s,setState:(n)=>{let o=r,i=n(o);if(Object.is(i,o))return;r=i,a?.({newState:i,oldState:o});for(let u of S)u()},subscribe:(n)=>{let o=fte(n);return S.add(o),()=>S.delete(o)}}}function c(t,e,r,S){return Object.is(S,r)?t:{...t,[e]:S}}
export{fN,rNn,QTr,oHe,_mt,XBi,Ds};
