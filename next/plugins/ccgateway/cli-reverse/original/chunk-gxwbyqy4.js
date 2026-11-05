
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{p}from"./chunk-k6qypy1d.js";import{sc}from"./chunk-z20c443b.js";import{v}from"./chunk-exfmq47h.js";import{mn,$c}from"./chunk-0nvx3515.js";import{o,A,u}from"./chunk-m4y44r15.js";var l=p(()=>A(u({marketplace:o(),plugin:o()})));function Vzr(){let e=v("tengu_harbor_ledger",[]),n=l().safeParse(e);return n.success?n.data:[]}function QG(){return mn("allow_channels")&&v("tengu_harbor",!1)}function Jzt(){if(!v("tengu_harbor",!1))return!0;let e=$c("allow_channels");return e!==null&&e!=="cache_miss"&&e!=="route_missing"}function Mhn(e){if(!e)return!1;let{name:n,marketplace:r}=sc(e);if(!r)return!1;return Vzr().some((t)=>t.plugin===n&&t.marketplace===r)}
export{Vzr,QG,Jzt,Mhn};
