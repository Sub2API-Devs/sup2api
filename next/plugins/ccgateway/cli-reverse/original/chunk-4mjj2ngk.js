
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{v}from"./chunk-exfmq47h.js";import{hr}from"./chunk-5ythzcas.js";import{i}from"./chunk-xjnnz630.js";import{PUt,Wu}from"./chunk-9ys74nhz.js";var yOt=5000;function qC(){if(i.CLAUDE_CODE_DISABLE_MCP_TASKS)return!1;return v("tengu_glowing_lark",Wu()===PUt&&!i.CLAUDE_CODE_REMOTE&&!hr())}function bIn(){return qC()&&v("tengu_mcp_task_worker_wake",!1)}function Wds(){return i.CLAUDE_CODE_DISABLE_MCP_TASK_BACKGROUND}
export{yOt,qC,bIn,Wds};
