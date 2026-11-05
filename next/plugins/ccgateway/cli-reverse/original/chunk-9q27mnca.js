
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{p}from"./chunk-k6qypy1d.js";import{vjo,tXn}from"./chunk-4bvd8bma.js";import{Dde,$Ci}from"./chunk-fepf8jp6.js";import{o,oe,A,u,T}from"./chunk-m4y44r15.js";var n=1,a=64,s="offer",t=p(()=>o().regex(Dde).refine($Ci)),c=p(()=>u({v:T(n),head:t(),branch:o().min(1).max(vjo).refine(tXn),ancestors:A(oe()).max(a).pipe(A(t()))}));function _zs(e){let r=c().safeParse(e[s]);return r.success?r.data:null}
export{_zs};
