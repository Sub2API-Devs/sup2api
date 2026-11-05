
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Ut}from"./chunk-3jnp0k38.js";import{i}from"./chunk-xjnnz630.js";import{non,FUn,h$t,wPr,Rse}from"./chunk-89fdmwf8.js";import{Sc,kee}from"./chunk-z20c443b.js";import{Kme}from"./chunk-95pbtx8d.js";import{$qo}from"./chunk-0hjter80.js";import{hgr}from"./chunk-kq89f1h5.js";import{DWe}from"./chunk-kzqbn6hv.js";var hqo=["Docs"],t=new Set(["claudedocs","claudepages"]);function x4r(e){return e.tier==="core"&&hqo.some((o)=>Kme(e.title)===Kme(o))}var Uri="The Docs type is filled only through the first-party Claude Docs connector, which is not attached in this session: for a document, make a page instead of starting from that type.";function hTt(e){return e.config.type==="claudeai-proxy"&&kee(e.config)&&hgr(e.config)||K_n(e)||$qo()&&e.config.type==="sdk"&&Ut(e.name)!==null&&t.has(Rse(e.serverInfo?.name??""))||i.CLAUDE_CODE_REMOTE===!0&&e.config.type==="http"&&e.config.scope==="dynamic"&&(!Sc(e.config)||hgr(e.config))&&(wPr(e.config)||non.has(e.name))}function K_n(e){return e.config.type==="sdk"&&DWe(e,{path:h$t,serverId:FUn})}function P4r(e){return e.some((o)=>(o.type==="connected"||o.type==="pending"||o.type==="cached")&&hTt(o))}
export{hqo,x4r,Uri,hTt,K_n,P4r};
