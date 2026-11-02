
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{ae}from"./chunk-agvbmc7h.js";import{QZ,Y2r,ZWo,sVe}from"./chunk-e6aww6q8.js";import{Ma,NOe}from"./chunk-srrcw01s.js";function Vce(){return sVe()||QZ(Ma,NOe())}function MTo(){if(!Vce())return null;if(ZWo()&&!QZ(Ma,NOe()))return Y2r;return"--chrome is blocked by your organization's MCP policy (an enterprise MCP config or a deniedMcpServers entry)."}function TWn(r){let{mode:e,isBypassPermissionsModeAvailable:o}=ae(r);return e==="bypassPermissions"||e==="plan"&&o}
export{Vce,MTo,TWn};
