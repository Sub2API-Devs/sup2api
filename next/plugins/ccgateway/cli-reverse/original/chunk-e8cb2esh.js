
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{_,ee}from"./chunk-6hadbefe.js";var gPt=0,wur=1,yCn=262144,n=5,_Cn=1048576,N1e=1e4;function bCn(r){let e=typeof r==="string"?Buffer.from(r,"utf8"):r,t=Buffer.allocUnsafe(n+e.length);return t.writeUInt32BE(e.length,0),t.writeUInt8(gPt,4),e.copy(t,n),t}function jj(r){let e=Buffer.from(_(r),"utf8"),t=Buffer.allocUnsafe(n+e.length);return t.writeUInt32BE(e.length,0),t.writeUInt8(wur,4),e.copy(t,n),t}function Eur(r,e){let t=Buffer.alloc(0),o=!1;return(l)=>{if(o)return;t=t.length===0?l:Buffer.concat([t,l]);while(t.length>=n){let f=t.readUInt32BE(0);if(f>_Cn){o=!0,e(`frame too large (${f} > ${_Cn})`);return}let u=n+f;if(t.length<u)return;let i=t.readUInt8(4),s=t.subarray(n,u);if(t=t.subarray(u),i===gPt)r({kind:gPt,payload:Buffer.from(s)});else if(i===wur){let c;try{c=ee(s.toString("utf8"))}catch{o=!0,e("bad ctrl json");return}r({kind:wur,ctrl:c})}else{o=!0,e(`unknown frame kind ${i}`);return}}}}
export{gPt,wur,yCn,_Cn,N1e,bCn,jj,Eur};
