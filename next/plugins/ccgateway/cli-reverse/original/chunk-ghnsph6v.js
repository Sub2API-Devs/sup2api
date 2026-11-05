
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Oe}from"./chunk-ndkzc8d3.js";import{Rl,Pn}from"./chunk-5ythzcas.js";import{i}from"./chunk-xjnnz630.js";function Ga(){if(!Oe(process.env.CLAUDE_CODE_COORDINATOR_MODE))return!1;if(Rl()&&!Pn()&&!i.CLAUDE_CODE_REMOTE)return!1;return!0}function jye(e){return Ga()&&e.agentId===void 0}
export{Ga,jye};
