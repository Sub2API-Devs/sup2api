
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{i}from"./chunk-xjnnz630.js";var Gxn="__no_reply_needed";function Tre(){return new Set((i.CLAUDE_CODE_TERMINAL_MCP_TOOLS||"").split(",").map((e)=>e.trim()).filter(Boolean))}function Ymr(){return Tre().values().some((e)=>e.endsWith(Gxn))}function $It(e){let r=Tre();if(r.size===0)return!1;let l=new Set;for(let o=e.length-1;o>=0;o--){let s=e[o];if(s.type==="user"){if(s.isMeta)continue;let t=s.message.content;if(!Array.isArray(t))return!1;let a=!1;for(let n of t)if(n.type==="tool_result"){if(a=!0,!n.is_error)l.add(n.tool_use_id)}if(!a)return!1}else if(s.type==="assistant"){for(let t of s.message.content)if(t.type==="tool_use"&&l.has(t.id)&&r.has(t.name))return!0}}return!1}
export{Gxn,Tre,Ymr,$It};
