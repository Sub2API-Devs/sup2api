
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Xo}from"./chunk-8824h7w7.js";import{Yt,qF,ZAe,_k}from"./chunk-72da5r6r.js";function Bds(t){return"  "+t.replace(q8e,`
`).split(`
`).join(`
  `)}var jds=FB,q8e=/\r\n?|[\u001c-\u001e\u2028\u2029\u0085\v\f]/g;function Y8e(t){return t.replace(q8e,`
`)}var hDe=/[\p{Cf}\p{Default_Ignorable_Code_Point}]/gu,{open:e,close:s,slash:i}=qF;function vXt(t,r){return r.replace(hDe,"").replace(new RegExp(`[${e}]([\\s${i}]*${Xo(t)}\\b(?:${ZAe(`^${e}${s}`,2)}[${s}])?)`,"giu"),(n,o)=>"["+o)}var kXt="forwarded_user_turns",Kje="forwarded_turn",p=["transcript",kXt,Kje];function Yct(t){let r=t;for(let n of p)r=vXt(n,r);return r}function FB(t){return"  "+Yct(Y8e(t)).split(`
`).join(`
  `)}var a=/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g;function tio(t){return Bds(Yt(_k(Y8e(t).replace(hDe,"").replace(a,""))))}
export{Bds,jds,q8e,Y8e,hDe,vXt,kXt,Kje,Yct,FB,tio};
