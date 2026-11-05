
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{G,gTo,K1,Iie}from"./chunk-5ythzcas.js";import{VLr}from"./chunk-za46rn2f.js";import{Ue}from"./chunk-2k62t388.js";import{NMn}from"./chunk-a2q0x549.js";import{createHash as s}from"crypto";import{join as i}from"path";function BT(){return K1()??i(Iie()??_Mt(),G())}function _Mt(){return i(Ue(),"uploads")}function h9(){return[_Mt(),Iie()??NMn()]}function GOn(t,e){return`${t}-${u(e)}`}function ulo(t){return s("sha256").update(t.toLowerCase()).digest("hex").slice(0,8)}var a=/^[A-Za-z0-9_-]{8}-/;function o(t){return VLr(t.replace(/_+$/,""))}function u(t){return o(t)?t+"_":t}function FIi(t){let e=t.replace(a,"");if(e.endsWith("_")&&o(e))return e.slice(0,-1);return e||t}var c=1024;function UIi(t,e){let n=gTo();if(!n.has(t)&&n.size>=c){let r=n.keys().next().value;if(r!==void 0)n.delete(r)}n.set(t,e)}function Uut(t){return gTo().get(t)}
export{BT,_Mt,h9,GOn,ulo,FIi,UIi,Uut};
