
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Oe}from"./chunk-0777tkjc.js";import{Vd,On}from"./chunk-ndmse9kj.js";import{i}from"./chunk-jhrww53q.js";function Ua(){if(!Oe(process.env.CLAUDE_CODE_COORDINATOR_MODE))return!1;if(Vd()&&!On()&&!i.CLAUDE_CODE_REMOTE)return!1;return!0}function wme(e){return Ua()&&e.agentId===void 0}
export{Ua,wme};
