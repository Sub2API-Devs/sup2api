
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{u1s}from"./chunk-0993wma0.js";import{Pl,_i}from"./chunk-za46rn2f.js";import{FM,Rke,Xct,rW}from"./chunk-8nfjhq0y.js";import{zi}from"./chunk-85eyj5gy.js";import{H8,MM}from"./chunk-7jxyna5q.js";var LFe=(()=>{try{return u1s(process.cwd())}catch{return process.cwd()}})();function k2r(r,e){let n=FM(r),t=FM(e);if(rW(n)||rW(t))return!0;if(n.skipped!==t.skipped)return!0;return Rke(n,t)}function aot(r,e){if(_i(r)||Pl(r))return[];let n=zi(r),t=n!==null&&n!==void 0?[n]:(()=>{let o=MM(r);return o.length>0?o:[r]})();return e===void 0?t:t.filter((o)=>H8(o,e)!=="same")}function Uvt(r,e){if(_i(r)||Pl(r))return[];let n=zi(r),t=n!==null&&n!==void 0?[n]:MM(r);return e===void 0?t:t.filter((s)=>H8(s,e)!=="same")}function h4e(r,e,n){if(e.length===0)return!1;if(!e.every((s)=>{let o=H8(r,s);if(o==="indeterminate")return!1;if(o==="same")return!0;return!k2r(s,r)}))return!1;if(n?.requireCovered===!0){let s=FM(r);if(rW(s))return!1;let o=(a)=>a.some((u)=>{let i=FM(u);if(rW(i))return!1;return Xct(s,i)});return o(n.coveredWitnesses??e)||o(n.extraCoveredRoots??[])}return!0}
export{LFe,k2r,aot,Uvt,h4e};
