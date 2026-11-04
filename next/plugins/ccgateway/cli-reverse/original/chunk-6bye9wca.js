
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{bks}from"./chunk-vk5xfx8n.js";import{yl,ai}from"./chunk-aat7wt0p.js";import{GM,sxe,Ovt,NW,R6,iO}from"./chunk-s61vbvea.js";import{vi}from"./chunk-t0gq9gyw.js";var WLe=(()=>{try{return bks(process.cwd())}catch{return process.cwd()}})();function dLr(r,e){let n=GM(r),t=GM(e);if(NW(n)||NW(t))return!0;if(n.skipped!==t.skipped)return!0;return sxe(n,t)}function t7e(r,e){if(ai(r)||yl(r))return[];let n=vi(r),t=n!==null&&n!==void 0?[n]:(()=>{let o=iO(r);return o.length>0?o:[r]})();return e===void 0?t:t.filter((o)=>R6(o,e)!=="same")}function cyt(r,e){if(ai(r)||yl(r))return[];let n=vi(r),t=n!==null&&n!==void 0?[n]:iO(r);return e===void 0?t:t.filter((s)=>R6(s,e)!=="same")}function BGe(r,e,n){if(e.length===0)return!1;if(!e.every((s)=>{let o=R6(r,s);if(o==="indeterminate")return!1;if(o==="same")return!0;return!dLr(s,r)}))return!1;if(n?.requireCovered===!0){let s=GM(r);if(NW(s))return!1;let o=(a)=>a.some((u)=>{let i=GM(u);if(NW(i))return!1;return Ovt(s,i)});return o(n.coveredWitnesses??e)||o(n.extraCoveredRoots??[])}return!0}
export{WLe,dLr,t7e,cyt,BGe};
