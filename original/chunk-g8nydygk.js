
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{b}from"./chunk-0wqny7vr.js";import{d}from"./chunk-2g090z7k.js";import{t}from"./chunk-cgr0tezp.js";import{Cn,qs,_I,Md,UOt,vct}from"./chunk-dcmhvw5a.js";import{WT}from"./chunk-bfnfj4kx.js";import{Qv}from"./chunk-aepeg2w5.js";import{kk,M6,lYo}from"./chunk-csq9ftr9.js";import{Xd,zC}from"./chunk-e6aww6q8.js";async function qke(n,i,r){let o=_I(n),{name:a,marketplace:e}=Md(o);if(e===Cn&&kk().nameRegistration===void 0)await Xd(r);let l=M6(a,e,i),m=UOt(e);if(!m&&e!==qs&&!vct(a,e))return l;let s=!1;try{s=await c(o,a,e,r)}catch(u){t(`Plugin telemetry: could not read the marketplace catalog to confirm "${n}" exists (${d(u)}); logging its name as third-party`)}return{...l,...m&&e!==void 0&&{marketplace_name_redacted:lYo(e)},...!s&&{plugin_name_redacted:b(Qv)}}}async function c(n,i,r,o){if(vct(i,r))return!0;if(r===qs)return WT(i)!==void 0;return await zC(n,o)!==null}
export{qke};
