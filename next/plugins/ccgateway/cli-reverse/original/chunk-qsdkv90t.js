
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{ht}from"./chunk-wztb57wq.js";import{mZ}from"./chunk-2qpdvtqf.js";import{ir,fd}from"./chunk-e6aww6q8.js";function s(){return require("./chunk-asne9cp8.js").mcpClientModule()}async function Bce(e,c,d){let i=ir(e.name,e.config),{captureDiscoveryGrantLeg:h,ensureDiscoveryCacheAccount:l,getMcpIdentityEpoch:f,persistRefreshedToolsIfPresent:m}=s();l();let a=fd()?h(e.name,e.config):void 0,n=ht().toolRefreshSequences,r=n.get(e)??{started:0,applied:0};n.set(e,r),r.started+=1;let p=r.started,{fetchToolsForClient:t}=s(),v=t.cache.get(i),g=f();t.cache.delete(i);let o=await t(e,d),u=s().getToolsListErrorForResult(o);if(u)return{status:"kept-previous",error:u};if(e.discoveryAuthFailure&&o.length===0)return{status:"kept-previous",error:"the server rejected tool discovery as unauthorized \u2014 the user needs to authorize this connector (e.g. via /mcp) before its tools are available"};if(r.applied>p)return{status:"kept-previous",error:"superseded by a newer concurrent refresh of this server \u2014 the newer refresh result is the one applied"};if(r.applied=p,c(e.name,mZ(e,o)),a)a.then((y)=>m(e,o,{identityEpoch:g,grantLeg:y}));return{status:"refreshed",newTools:o,previousToolsPromise:v}}
export{Bce};
