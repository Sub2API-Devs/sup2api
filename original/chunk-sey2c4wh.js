
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{In}from"./chunk-cgr0tezp.js";import{fhe}from"./chunk-dcmhvw5a.js";function afo(t,n){let e=In(t),r=n.map(In).sort(),s=fhe(e,r.map((d)=>({name:d})),{maxEditDistance:2});if(s)return`No MCP server named "${e}". Did you mean "${s}"? Run \`claude mcp list\` to see all.`;if(r.length===0)return`No MCP server named "${e}". Run \`claude mcp add\` to add one.`;let o=8,a=r.slice(0,o).join(", "),i=r.length>o?` (and ${r.length-o} more \u2014 run \`claude mcp list\` to see all)`:"";return`No MCP server named "${e}". Configured servers: ${a}${i}`}function JHn(t,n,e){if(e&&n.length===0)return`No MCP server named "${In(t)}". ${".mcp.json servers are awaiting approval \u2014 run `claude` in this directory to review them."}`;return afo(t,n)+(e?` (${".mcp.json servers are awaiting approval \u2014 run `claude` in this directory to review them."})`:"")}
export{afo,JHn};
