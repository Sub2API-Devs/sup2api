
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Le}from"./chunk-0777tkjc.js";import{tt}from"./chunk-ndmse9kj.js";import{t}from"./chunk-cgr0tezp.js";function u(){let r=Le(),e=new Map,o=0;return{emit(i,s){if(o===0){e.set(i,s);return}r.emit(i,s)},subscribe(i){o++;let s=[...e];e.clear();for(let[g,l]of s)i(g,l);let c=r.subscribe(i),n=!0;return()=>{if(n)n=!1,o--,c()}}}}var eTr=new tt(u),JLt="device-mcp-not-now";function WNn(r){return(e,o)=>{t(`[remote-tools] ${e}: ${o}`),eTr.of(r).emit(e,o)}}
export{eTr,JLt,WNn};
