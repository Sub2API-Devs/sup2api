
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{_,te}from"./chunk-cgr0tezp.js";var vvt=0,MZn=1,_yn=262144,n=5,byn=1048576,RNe=1e4;function Syn(r){let e=typeof r==="string"?Buffer.from(r,"utf8"):r,t=Buffer.allocUnsafe(n+e.length);return t.writeUInt32BE(e.length,0),t.writeUInt8(vvt,4),e.copy(t,n),t}function XB(r){let e=Buffer.from(_(r),"utf8"),t=Buffer.allocUnsafe(n+e.length);return t.writeUInt32BE(e.length,0),t.writeUInt8(MZn,4),e.copy(t,n),t}function DZn(r,e){let t=Buffer.alloc(0),o=!1;return(l)=>{if(o)return;t=t.length===0?l:Buffer.concat([t,l]);while(t.length>=n){let f=t.readUInt32BE(0);if(f>byn){o=!0,e(`frame too large (${f} > ${byn})`);return}let u=n+f;if(t.length<u)return;let i=t.readUInt8(4),s=t.subarray(n,u);if(t=t.subarray(u),i===vvt)r({kind:vvt,payload:Buffer.from(s)});else if(i===MZn){let c;try{c=te(s.toString("utf8"))}catch{o=!0,e("bad ctrl json");return}r({kind:MZn,ctrl:c})}else{o=!0,e(`unknown frame kind ${i}`);return}}}}
export{vvt,MZn,_yn,byn,RNe,Syn,XB,DZn};
