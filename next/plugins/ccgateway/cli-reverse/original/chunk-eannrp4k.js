
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Rk}from"./chunk-za46rn2f.js";import{tt,j6}from"./chunk-8824h7w7.js";function o(n){return j6(tt(n,".")," ")}function zls(n){return/^con(in|out)\$$/i.test(o(n))}var e=/[<>"|?*\\\x00-\x1f]/;function eRi(n){return n.split("/").some((t)=>e.test(t))}function Zhr(n){return n.split("/").some((t)=>t.includes(":")||t.endsWith(".")||t.endsWith(" ")||Rk(o(t).replace(/ {2,}/g," "))||zls(t))}var r=/^[^.]{1,6}~\d+(\.[^.]{1,3})?$/;function i(n){return j6(tt(n,":"),". ")}function NPn(n){return n.split("/").some((t)=>r.test(i(t)))}
export{zls,eRi,Zhr,NPn};
