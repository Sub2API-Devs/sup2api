
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{se}from"./chunk-8899qs36.js";import{dQ,rZr,RQo,Y6e}from"./chunk-5xgkngpb.js";import{qa,u0e}from"./chunk-mdeejm2h.js";function hme(){return Y6e()||dQ(qa,u0e())}function VFo(){if(!hme())return null;if(RQo()&&!dQ(qa,u0e()))return rZr;return"--chrome is blocked by your organization's MCP policy (an enterprise MCP config or a deniedMcpServers entry)."}function O3n(r){let{mode:e,isBypassPermissionsModeAvailable:o}=se(r);return e==="bypassPermissions"||e==="plan"&&o}
export{hme,VFo,O3n};
