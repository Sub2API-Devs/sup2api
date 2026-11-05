
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{i}from"./chunk-xjnnz630.js";import{t}from"./chunk-6hadbefe.js";import{vt,fe}from"./chunk-exfmq47h.js";import{Iz,V1e,hP,Oz}from"./chunk-7jxyna5q.js";import{qa}from"./chunk-mdeejm2h.js";var _Fr="https://clau.de/chrome/permissions",m={install:Iz,reconnect:V1e,permissions:_Fr};async function woa({mcpClients:s,atStartup:a}){let l=await Oz().catch((e)=>(t(`[Claude in Chrome] Extension detection failed: ${e instanceof Error?e.message:String(e)}`,{level:"error"}),!1)),o=fe(),r=s.some((e)=>e.name===qa&&e.type==="connected"),n=o.chromeExtension?.pairedDeviceName;return{allowed:hP(),subscriber:vt(),wsl:i.isWslEnvironment(),installed:l,connected:r,...r&&n&&{paired_browser:n},enabled_by_default:o.claudeInChromeDefaultEnabled??!1,at_startup:await a(o.claudeInChromeDefaultEnabled===!0),urls:{...m}}}
export{_Fr,woa};
