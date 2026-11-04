
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{p}from"./chunk-kpa9nk58.js";import{Cxo,Jzn}from"./chunk-6xf89m6d.js";import{vSe,_ti}from"./chunk-s61vbvea.js";import{o,oe,A,u,T}from"./chunk-7vp249v4.js";var n=1,a=64,s="offer",t=p(()=>o().regex(vSe).refine(_ti)),c=p(()=>u({v:T(n),head:t(),branch:o().min(1).max(Cxo).refine(Jzn),ancestors:A(oe()).max(a).pipe(A(t()))}));function yRs(e){let r=c().safeParse(e[s]);return r.success?r.data:null}
export{yRs};
