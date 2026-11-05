
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{i}from"./chunk-xjnnz630.js";import{tfe}from"./chunk-5fn9rb8r.js";function eje(){let e=i.CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL;if(!e||e.toLowerCase()==="inherit")return;if(i.CLAUDE_CODE_SUBAGENT_MODEL_FORCE&&tfe("CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL")?.trim()!==e)return;return e}
export{eje};
