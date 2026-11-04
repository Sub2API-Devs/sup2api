
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{xr,Ki}from"./chunk-dcmhvw5a.js";import{BCi}from"./chunk-1wpnxx5r.js";import{FP}from"./chunk-kc2qkj8w.js";import{thr}from"./chunk-bwbq4xvm.js";var t="(value set by your organization)";function uQe(r,e){if(e!=="managed")return r;return{...r,url:BCi(r.url)??t,...r.headers&&{headers:xr(r.headers,()=>t)}}}function Kgt(r){return r==="cached"?"pending":r}function ajn(r){return r.map((e)=>{let o;if(e.config.type==="sse"||e.config.type==="http")o=uQe({type:e.config.type,url:e.config.url,headers:e.config.headers},e.config.scope);else if(e.config.type==="claudeai-proxy")o={type:"claudeai-proxy",url:e.config.url,id:e.config.id};else if(e.config.type==="stdio"||e.config.type===void 0)o={type:"stdio",command:e.config.command,args:e.config.args};return{name:e.name,status:Kgt(e.type),config:o,scope:e.config.scope,source:FP(e.name,e.config),serverInfo:Ki(e)?e.serverInfo:void 0,error:e.type==="failed"?e.error:void 0,error_code:thr(e)}})}
export{uQe,Kgt,ajn};
