
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{D}from"./chunk-zhh3qac9.js";function mjo({toolUseID:n,parentToolUseID:s,data:e,withheldInput:o}){if(e.scriptHelper===!0)return;let t=o??(D(e.toolInput)?e.toolInput:{});return{type:"tool_progress",tool_use_id:n,tool_name:e.toolName,parent_tool_use_id:s,elapsed_time_seconds:0,inner_call:{tool_name:e.toolName,tool_input:t,tool_use_id:e.toolUseId,phase:e.phase,...o!==void 0&&{input_withheld:!0}},repl_call:{inner_tool_name:e.toolName,inner_tool_input:t,inner_tool_use_id:e.toolUseId,phase:e.phase}}}
export{mjo};
