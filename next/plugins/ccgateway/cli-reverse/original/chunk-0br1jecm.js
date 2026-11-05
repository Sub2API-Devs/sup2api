
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{te}from"./chunk-bjf8bvwf.js";import{ju,F1}from"./chunk-9ys74nhz.js";import{Ics,Mke,jB,NOt}from"./chunk-57tfkp5n.js";function Cqt(){let n=ju();return n?{entrypoint:n.toLowerCase().slice(0,64)}:{}}function I5r(){let n=Ics();return n&&!F1()?{session_id:n}:{}}var C5o=3600000;function Hnr(){let n=te().sessionHintsRefusedAt;if(n!==void 0&&Date.now()-n<C5o)return{};return{...Cqt(),...I5r()}}function Nnr(){te().sessionHintsRefusedAt=Date.now()}var O5r=["entrypoint","session_id","request_id"],u=new Set(O5r);function $nr(n,s,i){let o=O5r.filter((t)=>i[t]!==void 0);if(n!==400||o.length===0)return[];let e=jB(s);if(!Mke.test(e))return[];let r=o.filter((t)=>NOt(e,t));if(r.length>0)return r;return Object.keys(i).some((t)=>!u.has(t)&&NOt(e,t))?[]:o}function WSn(n){return n.includes("entrypoint")||n.includes("session_id")}function Osi(n){let{entrypoint:s,session_id:i,request_id:o,...e}=n;return e}
export{Cqt,I5r,C5o,Hnr,Nnr,O5r,$nr,WSn,Osi};
