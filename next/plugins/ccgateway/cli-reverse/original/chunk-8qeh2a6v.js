
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{De}from"./chunk-ndkzc8d3.js";import{t}from"./chunk-6hadbefe.js";import{Je}from"./chunk-r4yj9pae.js";function u(){let r=De(),e=new Map,o=0;return{emit(i,s){if(o===0){e.set(i,s);return}r.emit(i,s)},subscribe(i){o++;let s=[...e];e.clear();for(let[g,l]of s)i(g,l);let c=r.subscribe(i),n=!0;return()=>{if(n)n=!1,o--,c()}}}}var rNr=new Je(u),k1t="device-mcp-not-now";function KKn(r){return(e,o)=>{t(`[remote-tools] ${e}: ${o}`),rNr.of(r).emit(e,o)}}
export{rNr,k1t,KKn};
