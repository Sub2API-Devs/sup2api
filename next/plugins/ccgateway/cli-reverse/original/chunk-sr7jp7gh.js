
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{x6,c}from"./chunk-47b8txen.js";import{t}from"./chunk-6hadbefe.js";import{x}from"./chunk-8824h7w7.js";import{nd}from"./chunk-daj7hxcs.js";var aXt=(o)=>o.mcpInfo?.effectiveMaxPermission==="ask"?{ceiling:"ask"}:{};var nF=(o)=>({tool:o.name,ceiling:aXt(o).ceiling});function zct(o){return o.hook.type==="callback"&&o.hook.internal===!0}function fRi(o,n){if(nd()){let r=o.filter(zct),e=o.length-r.length;if(e>0)t(`Hooks: ${e} ${n} ${x(e,"hook")} from settings or plugins not run: claude mcp serve --transport http never runs them (intended)`,{level:"warn"}),c(x6(n),"not_run_in_tool_server_daemon",{num_dropped:e});return r}return o}
export{aXt,nF,zct,fRi};
