
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{v}from"./chunk-exfmq47h.js";import{i}from"./chunk-xjnnz630.js";function t(){return process.argv.includes("--agent-teams")}function ns(){if(!i.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS&&!t())return!1;if(!v("tengu_amber_flint",!0))return!1;return!0}async function Des(){if(!ns())return;let{captureTeammateModeSnapshot:e}=await import("./chunk-bkvy04nj.js");e()}
export{ns,Des};
