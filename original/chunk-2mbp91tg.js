
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{k7}from"./chunk-0777tkjc.js";function BH(t,e){return(r)=>t((S)=>c(S,e,S[e],r(S[e])))}function gCn(t){return(e)=>t((r)=>{let S=e(r);return Object.is(S,r)?r:{...r,...S}})}function Spr(t){return{getSnapshot:t.getSnapshot,getState:t.getState,setState:gCn(t.setState),subscribe:t.subscribe}}function wIe(t,e,r){return{get:()=>t()[r],set:BH(e,r)}}function $at(t,e){return(r,S)=>({get:()=>r()[t]??e,set:(a)=>S((s)=>{let n=s[t]??e;return c(s,t,n,a(n))})})}function KSi(t){let e=t;return{get:()=>e,set:(r)=>{e=r(e)}}}function hs(t,e){let r=t,S=new Set,a=e&&k7(e),s=()=>r;return{getSnapshot:s,getState:s,setState:(n)=>{let o=r,i=n(o);if(Object.is(i,o))return;r=i,a?.({newState:i,oldState:o});for(let u of S)u()},subscribe:(n)=>{let o=k7(n);return S.add(o),()=>S.delete(o)}}}function c(t,e,r,S){return Object.is(S,r)?t:{...t,[e]:S}}
export{BH,gCn,Spr,wIe,$at,KSi,hs};
