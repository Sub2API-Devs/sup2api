
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Xo}from"./chunk-m41h77x8.js";import{Wt,UK,nve,bv}from"./chunk-p5akk6be.js";function j6o(t){return"  "+t.replace(e4e,`
`).split(`
`).join(`
  `)}var W6o=VF,e4e=/\r\n?|[\u001c-\u001e\u2028\u2029\u0085\v\f]/g;function t4e(t){return t.replace(e4e,`
`)}var Nxe=/[\p{Cf}\p{Default_Ignorable_Code_Point}]/gu,{open:e,close:s,slash:i}=UK;function oqt(t,r){return r.replace(Nxe,"").replace(new RegExp(`[${e}]([\\s${i}]*${Xo(t)}\\b(?:${nve(`^${e}${s}`,2)}[${s}])?)`,"giu"),(n,o)=>"["+o)}var sqt="forwarded_user_turns",D$e="forwarded_turn",p=["transcript",sqt,D$e];function yot(t){let r=t;for(let n of p)r=oqt(n,r);return r}function VF(t){return"  "+yot(t4e(t)).split(`
`).join(`
  `)}var a=/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g;function b6r(t){return j6o(Wt(bv(t4e(t).replace(Nxe,"").replace(a,""))))}
export{j6o,W6o,e4e,t4e,Nxe,oqt,sqt,D$e,yot,VF,b6r};
