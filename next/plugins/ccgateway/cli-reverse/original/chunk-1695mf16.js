
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{nt}from"./chunk-aj4djjd6.js";import{_}from"./chunk-6hadbefe.js";import{p}from"./chunk-k6qypy1d.js";import{jc,O,u,B,T}from"./chunk-m4y44r15.js";var t=1,f=65536,r=p(()=>jc().min(0).default(0)),m=p(()=>u({version:jc()})),n=p(()=>u({version:T(t),generation:jc().min(1),appliedBeforeFirstAsk:O(),outcome:B(["applied","partial"]),filesApplied:r(),filesRefused:r(),settingsWritten:O().default(!1),replacedForeign:r(),writtenAtMs:jc().min(0)}));function H2o(o){let e=n().safeParse({...o,version:t});if(!e.success)throw Error("home ready row is off-schema");return Buffer.from(_(e.data))}function Z7n(o){if(o.length>f)return{ok:!1,reason:"oversize"};let e=nt(o.toString("utf8"),!1),s=m().safeParse(e);if(s.success&&s.data.version!==t)return{ok:!1,reason:"unsupported_version"};let a=n().safeParse(e);if(!a.success)return{ok:!1,reason:"malformed"};let{version:l,...i}=a.data;return{ok:!0,ready:i}}
export{H2o,Z7n};
