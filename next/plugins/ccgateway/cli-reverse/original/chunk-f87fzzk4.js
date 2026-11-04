
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{K,hco,kV,eye}from"./chunk-ndmse9kj.js";import{qEr}from"./chunk-aat7wt0p.js";import{$e}from"./chunk-cgcrer2m.js";import{ekn}from"./chunk-g54kbxqw.js";import{createHash as s}from"crypto";import{join as i}from"path";function NA(){return kV()??i(eye()??mTt(),K())}function mTt(){return i($e(),"uploads")}function y4e(){return[mTt(),eye()??ekn()]}function iwn(t,e){return`${t}-${u(e)}`}function m3r(t){return s("sha256").update(t.toLowerCase()).digest("hex").slice(0,8)}var a=/^[A-Za-z0-9_-]{8}-/;function o(t){return qEr(t.replace(/_+$/,""))}function u(t){return o(t)?t+"_":t}function Mai(t){let e=t.replace(a,"");if(e.endsWith("_")&&o(e))return e.slice(0,-1);return e||t}var c=1024;function Dai(t,e){let n=hco();if(!n.has(t)&&n.size>=c){let r=n.keys().next().value;if(r!==void 0)n.delete(r)}n.set(t,e)}function Dot(t){return hco().get(t)}
export{NA,mTt,y4e,iwn,m3r,Mai,Dai,Dot};
