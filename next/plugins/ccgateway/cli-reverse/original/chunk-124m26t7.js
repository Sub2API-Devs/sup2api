
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{p}from"./chunk-kpa9nk58.js";import{Md}from"./chunk-dcmhvw5a.js";import{v}from"./chunk-aepeg2w5.js";import{dn,ku}from"./chunk-55ht3bcx.js";import{o,A,u}from"./chunk-7vp249v4.js";var l=p(()=>A(u({marketplace:o(),plugin:o()})));function hDr(){let e=v("tengu_harbor_ledger",[]),n=l().safeParse(e);return n.success?n.data:[]}function Zj(){return dn("allow_channels")&&v("tengu_harbor",!1)}function mFt(){if(!v("tengu_harbor",!1))return!0;let e=ku("allow_channels");return e!==null&&e!=="cache_miss"&&e!=="route_missing"}function bin(e){if(!e)return!1;let{name:n,marketplace:r}=Md(e);if(!r)return!1;return hDr().some((t)=>t.plugin===n&&t.marketplace===r)}
export{hDr,Zj,mFt,bin};
