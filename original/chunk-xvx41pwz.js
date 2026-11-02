
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Oe}from"./chunk-0777tkjc.js";function qje(){return Oe(process.env.CLAUDE_CODE_REMOTE)&&String(process.env.CLAUDE_CODE_ENVIRONMENT_KIND??"").trim()===""}var s=/^(?:--port(?:=\d+)?|\d+|--result-format(?:=(?:raw|rendered))?|raw|rendered|--session-tunnel|--debug|-d|--verbose)$/;function Dl(){{let e=process.argv;if(e[2]!=="mcp"||e[3]!=="serve")return!1;let[,,t,...r]=e.slice(2),n=t==="--transport=http"?r:t==="--transport"&&r[0]==="http"?r.slice(1):void 0;return qje()&&n!==void 0&&n.every((o)=>s.test(o))}return!1}
export{qje,Dl};
