
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{tg,Nn}from"./chunk-dcmhvw5a.js";import{y4,Eit}from"./chunk-f3qhjfah.js";import{L2e,Hv,Xd,wb,zC}from"./chunk-e6aww6q8.js";function d(e){return e!==void 0&&tg(e)?{kind:"unresolved",reason:"Its marketplace is a folder whose catalog could not be read, or lists it no more."}:{kind:"copy"}}async function tfo(e,o){let[r,l]=await Promise.all([zC(e,o),Xd(o)]),n=l[Nn(e).marketplace??""]?.source;if(r===null)return d(n);let{source:t}=r.entry,c=L2e(t,n);if(typeof t!=="string"||!c)return{kind:"copy"};let i=wb(r.marketplaceInstallLocation)===void 0?"workspace":"system",a=await y4(e,r.marketplaceInstallLocation,t,l,Hv(),o,i);return a.kind==="ok"?{kind:"folder",path:a.entryPath}:{kind:"unresolved",reason:Eit(a,r.marketplaceInstallLocation,t).message}}export{tfo};
