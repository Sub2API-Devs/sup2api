
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{st}from"./chunk-kndsyy4v.js";import{_}from"./chunk-cgr0tezp.js";import{p}from"./chunk-kpa9nk58.js";import{tc,M,u,U,T}from"./chunk-7vp249v4.js";var t=1,f=65536,r=p(()=>tc().min(0).default(0)),m=p(()=>u({version:tc()})),n=p(()=>u({version:T(t),generation:tc().min(1),appliedBeforeFirstAsk:M(),outcome:U(["applied","partial"]),filesApplied:r(),filesRefused:r(),settingsWritten:M().default(!1),replacedForeign:r(),writtenAtMs:tc().min(0)}));function COo(o){let e=n().safeParse({...o,version:t});if(!e.success)throw Error("home ready row is off-schema");return Buffer.from(_(e.data))}function hVn(o){if(o.length>f)return{ok:!1,reason:"oversize"};let e=st(o.toString("utf8"),!1),s=m().safeParse(e);if(s.success&&s.data.version!==t)return{ok:!1,reason:"unsupported_version"};let a=n().safeParse(e);if(!a.success)return{ok:!1,reason:"malformed"};let{version:l,...i}=a.data;return{ok:!0,ready:i}}
export{COo,hVn};
