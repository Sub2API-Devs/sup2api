
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Qi}from"./chunk-z20c443b.js";import{jKi}from"./chunk-hfc4cfnt.js";import{hO}from"./chunk-kzqbn6hv.js";import{zRr}from"./chunk-7kayq7nc.js";import{xr}from"./chunk-1p0bwqzj.js";var t="(value set by your organization)";function hrt(r,e){if(e!=="managed")return r;return{...r,url:jKi(r.url)??t,...r.headers&&{headers:xr(r.headers,()=>t)}}}function xEt(r){return r==="cached"?"pending":r}function m6n(r){return r.map((e)=>{let o;if(e.config.type==="sse"||e.config.type==="http")o=hrt({type:e.config.type,url:e.config.url,headers:e.config.headers},e.config.scope);else if(e.config.type==="claudeai-proxy")o={type:"claudeai-proxy",url:e.config.url,id:e.config.id};else if(e.config.type==="stdio"||e.config.type===void 0)o={type:"stdio",command:e.config.command,args:e.config.args};return{name:e.name,status:xEt(e.type),config:o,scope:e.config.scope,source:hO(e.name,e.config),serverInfo:Qi(e)?e.serverInfo:void 0,error:e.type==="failed"?e.error:void 0,error_code:zRr(e)}})}
export{hrt,xEt,m6n};
