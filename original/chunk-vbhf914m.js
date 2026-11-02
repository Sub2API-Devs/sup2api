
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{i}from"./chunk-jhrww53q.js";import{t}from"./chunk-cgr0tezp.js";import{vt,ue}from"./chunk-aepeg2w5.js";import{LW,UNe,ox,HW}from"./chunk-s61vbvea.js";import{Ma}from"./chunk-srrcw01s.js";var gCr="https://clau.de/chrome/permissions",m={install:LW,reconnect:UNe,permissions:gCr};async function vWi({mcpClients:s,atStartup:a}){let l=await HW().catch((e)=>(t(`[Claude in Chrome] Extension detection failed: ${e instanceof Error?e.message:String(e)}`,{level:"error"}),!1)),o=ue(),r=s.some((e)=>e.name===Ma&&e.type==="connected"),n=o.chromeExtension?.pairedDeviceName;return{allowed:ox(),subscriber:vt(),wsl:i.isWslEnvironment(),installed:l,connected:r,...r&&n&&{paired_browser:n},enabled_by_default:o.claudeInChromeDefaultEnabled??!1,at_startup:await a(o.claudeInChromeDefaultEnabled===!0),urls:{...m}}}
export{gCr,vWi};
