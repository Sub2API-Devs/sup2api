
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Cv}from"./chunk-aat7wt0p.js";import{Ze,Cre}from"./chunk-m41h77x8.js";function u6o(n){return n.birthtimeNs>0n&&n.birthtimeNs!==n.ctimeNs?n.birthtimeNs.toString():void 0}function i(n){return n>=-(2n**63n)&&n<-1n?n+2n**64n:n}function fSn(n,t){return i(n)===i(t)}function e(n){return Cre(Ze(n,".")," ")}function f6o(n){return/^con(in|out)\$$/i.test(e(n))}var o=/[<>"|?*\\\x00-\x1f]/;function Rii(n){return n.split("/").some((t)=>o.test(t))}function Lrr(n){return n.split("/").some((t)=>t.includes(":")||t.endsWith(".")||t.endsWith(" ")||Cv(e(t).replace(/ {2,}/g," "))||f6o(t))}var r=/^[^.]{1,6}~\d+(\.[^.]{1,3})?$/;function s(n){return Cre(Ze(n,":"),". ")}function pSn(n){return n.split("/").some((t)=>r.test(s(t)))}
export{u6o,fSn,f6o,Rii,Lrr,pSn};
