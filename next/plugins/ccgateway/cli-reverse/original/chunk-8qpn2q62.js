
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Wh,Bn}from"./chunk-z20c443b.js";import{b5,upt}from"./chunk-5s0qaz1x.js";import{b5e,Mk,Rc,mS,tx}from"./chunk-5xgkngpb.js";function d(e){return e!==void 0&&Wh(e)?{kind:"unresolved",reason:"Its marketplace is a folder whose catalog could not be read, or lists it no more."}:{kind:"copy"}}async function aCo(e,o){let[r,l]=await Promise.all([tx(e,o),Rc(o)]),n=l[Bn(e).marketplace??""]?.source;if(r===null)return d(n);let{source:t}=r.entry,c=b5e(t,n);if(typeof t!=="string"||!c)return{kind:"copy"};let i=mS(r.marketplaceInstallLocation)===void 0?"workspace":"system",a=await b5(e,r.marketplaceInstallLocation,t,l,Mk(),o,i);return a.kind==="ok"?{kind:"folder",path:a.entryPath}:{kind:"unresolved",reason:upt(a,r.marketplaceInstallLocation,t).message}}export{aCo};
